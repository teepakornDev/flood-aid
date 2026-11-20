"use client";

import type { FloodReportReview, FloodReviewReason, FloodReviewStatus } from "@floodaid/contracts";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { formatObservationTime } from "../flood-reports/report-display";
import { getReportReview, ModerationError, submitReview } from "./moderation-api";
import { reviewReasons, verificationLabels } from "./review-labels";

const field = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal";

export function ReportReviewForm({ reportId, onSaved }: { reportId: string; onSaved: () => void }) {
  const [decision, setDecision] = useState<FloodReviewStatus | "">("");
  const [reason, setReason] = useState<FloodReviewReason | "">("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision || !reason || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setMessage("");
    try {
      const response = await submitReview(reportId, { verificationStatus: decision, reason });
      if (response?.reportId !== reportId || response.decision?.verificationStatus !== decision) {
        throw new Error("Review receipt missing");
      }
      onSaved();
    } catch (error) {
      if (error instanceof ModerationError && error.status === 409) {
        setMessage("รายงานนี้ถูกตรวจสอบแล้ว กรุณาโหลดรายการใหม่");
      } else if (error instanceof ModerationError && error.status === 403) {
        setMessage("บัญชีนี้ไม่มีสิทธิ์บันทึกผลตรวจสอบ");
      } else if (error instanceof ModerationError && error.status === 400) {
        setMessage("เลือกผลตรวจสอบและเหตุผลให้ตรงกัน");
      } else {
        setMessage("ยังยืนยันไม่ได้ว่าบันทึกผลสำเร็จ ลองส่งผลเดิมอีกครั้งได้");
      }
    } finally {
      setSaving(false);
      inFlight.current = false;
    }
  }

  return (
    <form method="post" onSubmit={(event) => void save(event)} className="grid gap-3">
      <label className="grid gap-1.5 text-sm font-semibold">
        ผลตรวจสอบ
        <select required value={decision} className={field} disabled={saving} onChange={(event) => {
          setDecision(event.target.value as FloodReviewStatus | "");
          setReason("");
        }}>
          <option value="">เลือกผลตรวจสอบ</option>
          <option value="VERIFIED">ยืนยันรายงาน</option>
          <option value="REJECTED">ปฏิเสธรายงาน</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        เหตุผล
        <select required value={reason} className={field} disabled={!decision || saving}
          onChange={(event) => setReason(event.target.value as FloodReviewReason | "")}>
          <option value="">เลือกเหตุผล</option>
          {decision && Object.entries(reviewReasons[decision]).map(([value, label]) =>
            <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {message && <p role="alert" className="text-sm text-red-800">{message}</p>}
      <button type="submit" disabled={!decision || !reason || saving}
        className="min-h-11 justify-self-start rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900 disabled:opacity-55">
        {saving ? "กำลังบันทึก…" : "บันทึกผลตรวจสอบ"}
      </button>
    </form>
  );
}

export function ReportReviewHistory({ reportId }: { reportId: string }) {
  const [result, setResult] = useState<FloodReportReview | "error" | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void getReportReview(reportId, controller.signal)
      .then((response) => { if (!controller.signal.aborted) setResult(response); })
      .catch(() => { if (!controller.signal.aborted) setResult("error"); });
    return () => controller.abort();
  }, [reportId, attempt]);

  if (!result) return <p role="status" className="text-sm">กำลังโหลดประวัติ…</p>;
  if (result === "error") return (
    <div className="grid gap-2 text-sm">
      <p role="alert">โหลดประวัติไม่สำเร็จ</p>
      <button type="button" className="min-h-11 justify-self-start text-teal-800 underline" onClick={() => {
        setResult(null);
        setAttempt((value) => value + 1);
      }}>โหลดประวัติใหม่</button>
    </div>
  );
  const { decision } = result;
  if (!decision) return <p className="text-sm">ไม่มีบันทึกการตรวจสอบสำหรับรายงานนี้</p>;
  return (
    <dl className="grid gap-2 text-sm">
      <div><dt className="font-semibold">ผลตรวจสอบ</dt><dd>{verificationLabels[decision.verificationStatus]}</dd></div>
      <div><dt className="font-semibold">เหตุผล</dt><dd>{reviewReasons[decision.verificationStatus][decision.reason]}</dd></div>
      <div><dt className="font-semibold">ผู้ตรวจสอบ</dt><dd className="break-all">{decision.actorName ?? decision.actorId}</dd></div>
      <div><dt className="font-semibold">เวลาตรวจสอบ</dt><dd><time dateTime={decision.reviewedAt}>{formatObservationTime(decision.reviewedAt)}</time> (เวลาไทย)</dd></div>
    </dl>
  );
}
