"use client";

import type { CreateFloodReport, FloodReportReceipt, FloodSeverity, RoadStatus } from "@floodaid/contracts";
import Link from "next/link";
import { type FormEvent, useCallback, useRef, useState } from "react";
import { ObservationMap } from "../../components/map/observation-map";
import { CoordinateFields, coordinateFields, type CoordinateFieldsValue } from "./coordinate-fields";
import { FloodReportRequestError, submitFloodReport } from "./report-api";
import { defaultCenter, formatObservationTime, type MapPoint, readPoint, roadLabels, severityLabels } from "./report-display";

const primary = "inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-800 px-4 py-2.5 font-semibold text-white hover:bg-teal-900 disabled:opacity-60";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-60";
const field = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal";

export function ReportForm() {
  const [coordinates, setCoordinates] = useState<CoordinateFieldsValue>(["", ""]);
  const [center, setCenter] = useState<MapPoint>(defaultCenter);
  const [accuracy, setAccuracy] = useState<number>();
  const [gpsPending, setGpsPending] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("");
  const gpsRequest = useRef(0);
  const [severity, setSeverity] = useState<FloodSeverity>("MODERATE");
  const [roadStatus, setRoadStatus] = useState<RoadStatus>("UNKNOWN");
  const [observationTime, setObservationTime] = useState("");
  const [description, setDescription] = useState("");
  const [draft, setDraft] = useState<CreateFloodReport | null>(null);
  const [receipt, setReceipt] = useState<FloodReportReceipt | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  const selectCoordinates = useCallback((value: CoordinateFieldsValue) => {
    gpsRequest.current++;
    setGpsPending(false);
    setAccuracy(undefined);
    setGpsMessage("");
    setCoordinates(value);
  }, []);

  const pickPoint = useCallback((point: MapPoint) => {
    selectCoordinates(coordinateFields(point));
  }, [selectCoordinates]);

  function useGps() {
    if (!navigator.geolocation) {
      setGpsMessage("อุปกรณ์นี้ใช้ GPS ไม่ได้ เลือกจุดบนแผนที่หรือกรอกพิกัดได้");
      return;
    }
    const requestId = ++gpsRequest.current;
    setGpsPending(true);
    setGpsMessage("");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (requestId !== gpsRequest.current) return;
      const point: MapPoint = [coords.longitude, coords.latitude];
      setCoordinates(coordinateFields(point));
      setCenter(point);
      setAccuracy(coords.accuracy <= 100000 ? coords.accuracy : undefined);
      setGpsPending(false);
      setGpsMessage("เพิ่มตำแหน่งแล้ว ตรวจว่าหมุดตรงกับจุดที่พบน้ำท่วม");
    }, () => {
      if (requestId !== gpsRequest.current) return;
      setGpsPending(false);
      setGpsMessage("เข้าถึง GPS ไม่ได้ เลือกจุดบนแผนที่หรือกรอกพิกัดได้");
    }, { timeout: 10_000, maximumAge: 30_000 });
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const position = readPoint(...coordinates);
    const time = new Date(observationTime);
    if (!position) {
      setMessage("เลือกจุดน้ำท่วมหรือกรอกละติจูดและลองจิจูดให้ครบ");
      return;
    }
    if (!Number.isFinite(time.getTime()) || time.getTime() > Date.now() + 5 * 60_000) {
      setMessage("ระบุวันและเวลาที่สังเกต โดยเผื่อความคลาดเคลื่อนไม่เกิน 5 นาที");
      return;
    }
    gpsRequest.current++;
    setGpsPending(false);
    setMessage("");
    setDraft({
      location: { latitude: position[1], longitude: position[0], accuracyMeters: accuracy },
      severity,
      roadStatus,
      observedAt: time.toISOString(),
      description: description.trim() || undefined,
    });
  }

  async function send(report: CreateFloodReport) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setMessage("");
    try {
      setReceipt(await submitFloodReport(report));
    } catch (error) {
      if (error instanceof FloodReportRequestError && error.status === 429) {
        setMessage("ส่งรายงานบ่อยเกินไป กรุณารอสักครู่แล้วลองอีกครั้ง");
      } else if (error instanceof FloodReportRequestError && error.status >= 400 && error.status < 500) {
        setMessage("ระบบปฏิเสธรายงาน กรุณากลับไปตรวจตำแหน่งและเวลาที่สังเกต");
      } else {
        setMessage("ยังยืนยันไม่ได้ว่าบันทึกรายงานสำเร็จ ลองส่งรายงานเดิมอีกครั้งได้");
      }
    } finally {
      setSaving(false);
      inFlight.current = false;
    }
  }

  if (receipt && draft) {
    const mapQuery = new URLSearchParams({
      lat: draft.location.latitude.toFixed(3), lon: draft.location.longitude.toFixed(3),
    });
    return (
      <section className="grid gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-6" aria-live="polite">
        <h2 className="text-xl font-semibold text-teal-950">บันทึกรายงานแล้ว</h2>
        <p>แผนที่จะแสดงรายงานที่สังเกตใน 24 ชั่วโมงล่าสุด</p>
        <p className="break-all text-sm text-slate-700">เลขรายงาน <strong>{receipt.id}</strong></p>
        <Link href={`/map?${mapQuery}`} className={`${primary} justify-self-start`}>ดูแผนที่บริเวณที่รายงาน</Link>
      </section>
    );
  }

  if (draft) {
    return (
      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div role="status"><h2 className="text-xl font-semibold">ตรวจทานก่อนส่ง</h2></div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-600">พิกัดที่สังเกต</dt><dd>{draft.location.latitude}, {draft.location.longitude}</dd></div>
          <div><dt className="text-slate-600">เวลาที่สังเกต (เวลาไทย)</dt><dd>{formatObservationTime(draft.observedAt)}</dd></div>
          <div><dt className="text-slate-600">ระดับน้ำท่วม</dt><dd>{severityLabels[draft.severity]}</dd></div>
          <div><dt className="text-slate-600">สภาพถนน</dt><dd>{roadLabels[draft.roadStatus]}</dd></div>
          {draft.description && <div className="sm:col-span-2"><dt className="text-slate-600">รายละเอียดเพิ่มเติม</dt><dd className="break-words whitespace-pre-wrap">{draft.description}</dd></div>}
        </dl>
        {message && <p role="alert" className="text-sm text-red-800">{message}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={saving} className={primary} onClick={() => void send(draft)}>
            {saving ? "กำลังส่ง…" : message ? "ลองส่งรายงานอีกครั้ง" : "ยืนยันและส่งรายงาน"}
          </button>
          <button type="button" disabled={saving} className={secondary} onClick={() => { setDraft(null); setMessage(""); }}>กลับไปแก้ไข</button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={review} className="grid gap-6">
      <fieldset className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <legend className="px-1 text-lg font-semibold">จุดที่พบน้ำท่วม</legend>
        <p className="text-sm text-slate-700">แตะจุดบนแผนที่ ใช้ GPS หรือกรอกพิกัดเอง ตำแหน่งบนแผนที่สาธารณะจะเป็นพิกัดโดยประมาณ</p>
        <button type="button" disabled={gpsPending} className={`${secondary} justify-self-start`} onClick={useGps}>
          {gpsPending ? "กำลังหาตำแหน่ง…" : "ใช้ตำแหน่ง GPS"}
        </button>
        {gpsMessage && <p role="status" className="text-sm">{gpsMessage}</p>}
        <ObservationMap center={center} pin={readPoint(...coordinates)} onPick={pickPoint} />
        <CoordinateFields value={coordinates} onChange={selectCoordinates} />
      </fieldset>

      <fieldset className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 sm:p-7">
        <legend className="px-1 text-lg font-semibold">สิ่งที่สังเกต</legend>
        <label className="grid gap-1.5 text-sm font-semibold">
          ระดับน้ำท่วม
          <select className={field} value={severity} onChange={(event) => setSeverity(event.target.value as FloodSeverity)}>
            {Object.entries(severityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          สภาพถนน
          <select className={field} value={roadStatus} onChange={(event) => setRoadStatus(event.target.value as RoadStatus)}>
            {Object.entries(roadLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="grid gap-2 sm:col-span-2">
          <label className="grid gap-1.5 text-sm font-semibold">
            วันและเวลาที่สังเกต
            <input type="datetime-local" required className={field} value={observationTime} onChange={(event) => setObservationTime(event.target.value)} />
            <span className="font-normal text-slate-600">กรอกตามเวลาของอุปกรณ์</span>
          </label>
          <button type="button" className={`${secondary} justify-self-start text-sm`} onClick={() => {
            const now = new Date();
            setObservationTime(new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16));
          }}>ใช้เวลาตอนนี้</button>
        </div>
        <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
          รายละเอียดเพิ่มเติม (ไม่บังคับ)
          <textarea rows={3} maxLength={500} className={field} value={description} onChange={(event) => setDescription(event.target.value)} />
          <span className="font-normal text-slate-600">สูงสุด 500 ตัวอักษร กรุณาเว้นชื่อ เบอร์โทร และที่อยู่บ้าน</span>
        </label>
      </fieldset>
      {message && <p role="alert" className="text-sm text-red-800">{message}</p>}
      <button type="submit" className={`${primary} justify-self-start`}>ตรวจทานรายงาน</button>
    </form>
  );
}
