"use client";

import type { SosPrivateStatus, SosStatus } from "@floodaid/contracts";
import { type FormEvent, useState } from "react";
import { formatObservationTime } from "../flood-reports/report-display";
import { caseIdPattern, sosCredentialPattern, SosRequestError, trackSos } from "./sos-api";

const labels: Record<SosStatus, string> = {
  SUBMITTED: "ระบบบันทึกคำขอแล้ว",
  TRIAGED: "เจ้าหน้าที่ประเมินคำขอแล้ว",
  ASSIGNED: "กำหนดทีมแล้ว",
  EN_ROUTE: "ทีมกำลังเดินทาง",
  RESOLVED: "ดำเนินการเสร็จแล้ว",
  CANCELLED: "ยกเลิกคำขอแล้ว",
  UNABLE_TO_REACH: "ติดต่อหรือเข้าถึงไม่ได้",
};
const field = "min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal";

export function SosTracker({ caseId }: { caseId?: string }) {
  const [id, setId] = useState(caseId ?? "");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<SosPrivateStatus | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setStatus(null);
    setMessage("");
    if (!caseIdPattern.test(id.trim()) || !sosCredentialPattern.test(token.trim())) {
      setMessage("ตรวจเลขคำขอและรหัสติดตามให้ครบ");
      return;
    }
    setLoading(true);
    try {
      setStatus(await trackSos(id.trim(), token.trim()));
    } catch (error) {
      setMessage(error instanceof SosRequestError && error.status === 404
        ? "เปิดคำขอไม่ได้ กรุณาตรวจเลขคำขอและรหัสติดตาม"
        : "โหลดสถานะไม่ได้ในขณะนี้ กรุณาลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form method="post" onSubmit={(event) => void check(event)} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <label className="grid gap-1.5 text-sm font-semibold">
          เลขคำขอ
          <input className={field} value={id} maxLength={36} required disabled={loading} readOnly={Boolean(caseId)}
            autoComplete="off" spellCheck={false} onChange={(event) => { setId(event.target.value); setStatus(null); }} />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          รหัสติดตามส่วนตัว
          <input className={field} type="password" value={token} maxLength={43} required disabled={loading}
            autoComplete="off" spellCheck={false} onChange={(event) => { setToken(event.target.value); setStatus(null); }} />
        </label>
        {message && <p role="alert" className="text-sm text-red-800">{message}</p>}
        <button type="submit" disabled={loading}
          className="min-h-11 justify-self-start rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
          {loading ? "กำลังโหลดสถานะ…" : "ตรวจสอบสถานะ"}
        </button>
      </form>
      {status && (
        <section className="grid gap-2 rounded-xl border border-teal-200 bg-teal-50 p-5" aria-live="polite">
          <h2 className="text-lg font-bold">{labels[status.status]}</h2>
          {status.status === "SUBMITTED" && <p className="text-sm">สถานะนี้ยืนยันว่าข้อมูลถูกบันทึกในระบบจำลอง</p>}
          <p className="text-sm">อัปเดต <time dateTime={status.updatedAt}>{formatObservationTime(status.updatedAt)}</time> (เวลาไทย)</p>
        </section>
      )}
    </>
  );
}
