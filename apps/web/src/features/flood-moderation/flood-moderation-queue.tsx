"use client";

import type { FloodModerationPage, VerificationStatus } from "@floodaid/contracts";
import { useEffect, useState } from "react";
import { formatObservationTime, roadLabels, severityLabels } from "../flood-reports/report-display";
import { getReviewQueue, ModerationError } from "./moderation-api";
import { ReportReviewForm, ReportReviewHistory } from "./report-review-panel";
import { verificationLabels } from "./review-labels";

const secondary = "min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50";
type Result = { key: string; page: FloodModerationPage | null; denied?: boolean };

export function FloodModerationQueue() {
  const [status, setStatus] = useState<VerificationStatus>("UNVERIFIED");
  const [pages, setPages] = useState<(string | null)[]>([null]);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const cursor = pages.at(-1) ?? null;
  const key = `${status}:${cursor}:${refresh}`;

  useEffect(() => {
    const controller = new AbortController();
    void getReviewQueue(status, cursor, controller.signal)
      .then((page) => { if (!controller.signal.aborted) setResult({ key, page }); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ key, page: null, denied: error instanceof ModerationError && error.status === 403 });
        }
      });
    return () => controller.abort();
  }, [status, cursor, key]);

  const visible = result?.key === key ? result : null;
  const page = visible?.page;

  function reload() {
    setSelected(null);
    setRefresh((value) => value + 1);
  }

  return (
    <section className="grid gap-4" aria-label="คิวรายงานน้ำท่วม">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-semibold">
          สถานะรายงาน
          <select value={status} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
            onChange={(event) => {
              setStatus(event.target.value as VerificationStatus);
              setPages([null]);
              setSelected(null);
              setFeedback("");
            }}>
            {Object.entries(verificationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="button" onClick={reload} className={secondary}>โหลดรายการใหม่</button>
      </div>
      {feedback && <p role="status" className="rounded-lg bg-teal-50 p-3 text-sm text-teal-950">{feedback}</p>}
      {!visible && <p role="status" className="text-sm text-slate-700">กำลังโหลดรายการ…</p>}
      {visible && !page && (
        <p role="alert" className="text-sm text-red-800">
          {visible.denied ? "บัญชีนี้ไม่มีสิทธิ์เปิดคิวตรวจสอบ" : "โหลดรายการไม่สำเร็จ กดโหลดรายการใหม่เพื่อลองอีกครั้ง"}
        </p>
      )}
      {page?.reports.length === 0 && <p className="rounded-lg border border-slate-200 bg-white p-4">ไม่มีรายงานในสถานะนี้</p>}
      {page && page.reports.length > 0 && (
        <ul className="grid gap-3">
          {page.reports.map((report) => {
            const expanded = selected === report.id;
            const reviewable = report.verificationStatus === "UNVERIFIED";
            return (
              <li key={report.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="grid gap-1">
                    <h2 className="text-lg font-semibold">น้ำท่วม{severityLabels[report.severity]}</h2>
                    <p className="text-sm text-slate-700">{roadLabels[report.roadStatus]}</p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                    {verificationLabels[report.verificationStatus]}
                  </span>
                </div>
                <p className="text-sm text-slate-700">
                  สังเกตเมื่อ <time dateTime={report.observedAt}>{formatObservationTime(report.observedAt)}</time> (เวลาไทย)
                </p>
                <p className="text-sm text-slate-700">พิกัดโดยประมาณ {report.latitude.toFixed(3)}, {report.longitude.toFixed(3)}</p>
                <button type="button" className={`${secondary} justify-self-start`}
                  aria-expanded={expanded} aria-controls={`review-${report.id}`}
                  onClick={() => setSelected(expanded ? null : report.id)}>
                  {expanded ? "ปิดรายละเอียด" : reviewable ? "ตรวจสอบรายงาน" : "ดูประวัติการตรวจสอบ"}
                </button>
                <div id={`review-${report.id}`} hidden={!expanded}>
                  {expanded && (
                    <div className="grid gap-4 border-t border-slate-200 pt-4">
                      <p className="break-all text-xs text-slate-600">เลขรายงาน {report.id}</p>
                      {report.description && (
                        <div className="grid gap-1 text-sm">
                          <p className="font-semibold">รายละเอียดที่ผู้รายงานส่งมา</p>
                          <p className="whitespace-pre-wrap break-words text-slate-700">{report.description}</p>
                        </div>
                      )}
                      {reviewable
                        ? <ReportReviewForm reportId={report.id} onSaved={() => { setFeedback("บันทึกผลตรวจสอบแล้ว"); reload(); }} />
                        : <ReportReviewHistory reportId={report.id} />}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {page && (pages.length > 1 || page.nextCursor) && (
        <nav aria-label="หน้ารายการ" className="flex flex-wrap items-center gap-3">
          <button type="button" className={secondary} disabled={pages.length === 1} onClick={() => {
            setSelected(null);
            setPages((current) => current.slice(0, -1));
          }}>ก่อนหน้า</button>
          <span className="text-sm">หน้า {pages.length}</span>
          <button type="button" className={secondary} disabled={!page.nextCursor} onClick={() => {
            if (!page.nextCursor) return;
            setSelected(null);
            setPages((current) => [...current, page.nextCursor]);
          }}>ถัดไป</button>
        </nav>
      )}
    </section>
  );
}
