"use client";

import type { CreateSosRequest, SosAssistanceType, SosReceipt } from "@floodaid/contracts";
import Link from "next/link";
import { type FormEvent, useCallback, useRef, useState } from "react";
import { ObservationMap } from "../../components/map/observation-map";
import { CoordinateFields, coordinateFields, type CoordinateFieldsValue } from "../flood-reports/coordinate-fields";
import { defaultCenter, formatObservationTime, type MapPoint, readPoint } from "../flood-reports/report-display";
import { newSosKey, sendSos, SosRequestError } from "./sos-api";

const assistanceLabels: Record<SosAssistanceType, string> = {
  EVACUATION: "อพยพออกจากพื้นที่",
  FOOD: "อาหาร",
  WATER: "น้ำดื่ม",
  MEDICAL: "ความช่วยเหลือทางการแพทย์",
};
const primary = "inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900 disabled:opacity-60";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 font-semibold hover:bg-slate-100";
const field = "min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal";
const panel = "grid min-w-0 gap-4 rounded-2xl border border-slate-200 bg-white p-5";

function Receipt({ receipt }: { receipt: SosReceipt }) {
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(`เลขคำขอ: ${receipt.id}\nรหัสติดตาม: ${receipt.trackingToken}`);
      setNotice("คัดลอกแล้ว กรุณาเก็บข้อมูลนี้เป็นส่วนตัว");
    } catch {
      setNotice("คัดลอกอัตโนมัติไม่ได้ เปิดแสดงรหัสเพื่อเลือกคัดลอกด้วยตัวเอง");
    }
  }
  return (
    <section className="grid gap-4 rounded-2xl border border-teal-200 bg-teal-50 p-5" aria-labelledby="sos-receipt">
      <h2 id="sos-receipt" className="text-xl font-bold text-teal-950">ระบบบันทึกคำขอทดสอบแล้ว</h2>
      <p className="text-sm">บันทึกเมื่อ {formatObservationTime(receipt.createdAt)} (เวลาไทย) คำขอนี้อยู่ในโหมดจำลอง</p>
      <p className="text-sm">เก็บเลขคำขอและรหัสติดตามไว้เป็นส่วนตัวก่อนออกจากหน้านี้</p>
      <label className="grid gap-1 text-sm font-semibold">
        เลขคำขอ
        <input className={field} value={receipt.id} readOnly />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        รหัสติดตามส่วนตัว
        <input className={field} type={show ? "text" : "password"} value={receipt.trackingToken}
          autoComplete="off" spellCheck={false} readOnly />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className={secondary} type="button" onClick={() => setShow((value) => !value)}>{show ? "ซ่อนรหัสติดตาม" : "แสดงรหัสติดตาม"}</button>
        <button className={secondary} type="button" onClick={() => void copy()}>คัดลอกเลขและรหัส</button>
        <Link className={primary} href={`/sos/${receipt.id}`}>เปิดหน้าติดตาม</Link>
      </div>
      {notice && <p role="status" className="text-sm">{notice}</p>}
    </section>
  );
}

export function SosForm() {
  const [coordinates, setCoordinates] = useState<CoordinateFieldsValue>(["", ""]);
  const [center, setCenter] = useState<MapPoint>(defaultCenter);
  const [accuracy, setAccuracy] = useState<number>();
  const [gpsPending, setGpsPending] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("");
  const gpsRequest = useRef(0);
  const [assistanceType, setAssistanceType] = useState<SosAssistanceType>("EVACUATION");
  const [people, setPeople] = useState("1");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [draft, setDraft] = useState<{ body: CreateSosRequest; key: string } | null>(null);
  const [receipt, setReceipt] = useState<SosReceipt | null>(null);
  const [started, setStarted] = useState(false);
  const [closed, setClosed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);

  const setManual = useCallback((value: CoordinateFieldsValue) => {
    gpsRequest.current++;
    setAccuracy(undefined);
    setGpsPending(false);
    setCoordinates(value);
  }, []);

  const pickPoint = useCallback((point: MapPoint) => {
    setManual(coordinateFields(point));
  }, [setManual]);

  function useGps() {
    if (!navigator.geolocation) {
      setGpsMessage("ใช้ GPS ไม่ได้ เลือกหมุดหรือกรอกพิกัดเองได้");
      return;
    }
    const request = ++gpsRequest.current;
    setGpsPending(true);
    setGpsMessage("");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (request !== gpsRequest.current) return;
      const point: MapPoint = [coords.longitude, coords.latitude];
      setCenter(point);
      setCoordinates(coordinateFields(point));
      setAccuracy(coords.accuracy <= 100000 ? coords.accuracy : undefined);
      setGpsPending(false);
      setGpsMessage("เพิ่มตำแหน่งแล้ว ตรวจว่าพิกัดถูกต้องก่อนส่ง");
    }, () => {
      if (request !== gpsRequest.current) return;
      setGpsPending(false);
      setGpsMessage("เข้าถึง GPS ไม่ได้ เลือกหมุดหรือกรอกพิกัดเองได้");
    }, { timeout: 10_000, maximumAge: 30_000 });
  }

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const point = readPoint(...coordinates);
    const peopleCount = Number(people);
    if (!point || !Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 1000) {
      setMessage("ตรวจพิกัดและระบุจำนวนคนตั้งแต่ 1 ถึง 1,000 คน");
      return;
    }
    gpsRequest.current++;
    setGpsPending(false);
    setMessage("");
    setDraft({
      key: newSosKey(),
      body: {
        location: { latitude: point[1], longitude: point[0], accuracyMeters: accuracy },
        assistanceType, peopleCount, description: description.trim() || undefined, contact: contact.trim() || undefined,
      },
    });
  }

  async function submit() {
    if (!draft || inFlight.current) return;
    inFlight.current = true;
    setStarted(true);
    setSaving(true);
    setMessage("");
    try {
      setReceipt(await sendSos(draft.body, draft.key));
      setDraft(null);
      setCoordinates(["", ""]);
      setDescription("");
      setContact("");
    } catch (error) {
      if (error instanceof SosRequestError && error.code === "SOS_RECEIPT_EXPIRED") {
        setClosed(true);
        setMessage("ระบบเคยบันทึกคำขอนี้แล้ว แต่หมดช่วงเวลากู้ใบรับคำขอ");
      } else if (error instanceof SosRequestError && error.status === 409) {
        setClosed(true);
        setMessage("คีย์ของคำขอนี้มีข้อมูลไม่ตรงกับคำขอที่ส่งก่อนหน้า");
      } else if (error instanceof SosRequestError && error.status === 400 && !started) {
        setStarted(false);
        setMessage("ระบบปฏิเสธข้อมูล โปรดกลับไปตรวจข้อมูลก่อนส่ง");
      } else if (error instanceof SosRequestError && error.status === 429) {
        setMessage("ส่งคำขอทดสอบถี่เกินไป กรุณารอแล้วลองส่งคำขอเดิมอีกครั้ง");
      } else {
        setMessage("ยังยืนยันการบันทึกไม่ได้ ให้เปิดหน้านี้ไว้แล้วลองส่งคำขอเดิมอีกครั้ง");
      }
    } finally {
      setSaving(false);
      inFlight.current = false;
    }
  }

  if (receipt) return <Receipt receipt={receipt} />;
  if (draft) return (
    <section className={panel} aria-labelledby="sos-review">
      <h2 id="sos-review" className="text-xl font-bold">ตรวจทานคำขอทดสอบ</h2>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="font-semibold">ประเภทความช่วยเหลือ</dt><dd>{assistanceLabels[draft.body.assistanceType]}</dd></div>
        <div><dt className="font-semibold">จำนวนคน</dt><dd>{draft.body.peopleCount}</dd></div>
        <div><dt className="font-semibold">พิกัด</dt><dd>{draft.body.location.latitude}, {draft.body.location.longitude}</dd></div>
        {draft.body.contact && <div><dt className="font-semibold">ช่องทางติดต่อสมมติ</dt><dd className="break-all">{draft.body.contact}</dd></div>}
        {draft.body.description && <div className="sm:col-span-2"><dt className="font-semibold">รายละเอียดสมมติ</dt><dd className="whitespace-pre-wrap break-words">{draft.body.description}</dd></div>}
      </dl>
      {message && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{message}</p>}
      <div className="flex flex-wrap gap-2">
        {!closed && <button type="button" className={primary} disabled={saving} onClick={() => void submit()}>
          {saving ? "กำลังส่งคำขอ…" : started ? "ลองส่งคำขอเดิมอีกครั้ง" : "ส่งคำขอทดสอบ"}
        </button>}
        {!started && <button type="button" className={secondary} onClick={() => { setDraft(null); setMessage(""); }}>กลับไปแก้ไข</button>}
      </div>
    </section>
  );

  return (
    <form method="post" onSubmit={review} className="grid gap-5">
      <fieldset className={panel}>
        <legend className="px-1 text-lg font-semibold">ตำแหน่งที่ต้องการความช่วยเหลือ</legend>
        <button type="button" onClick={useGps} disabled={gpsPending} className={`${secondary} justify-self-start disabled:opacity-60`}>
          {gpsPending ? "กำลังหาตำแหน่ง…" : "ใช้ตำแหน่ง GPS"}
        </button>
        {gpsMessage && <p role="status" className="text-sm">{gpsMessage}</p>}
        <ObservationMap center={center} bundledOnly pin={readPoint(...coordinates)} onPick={pickPoint} />
        <CoordinateFields value={coordinates} onChange={setManual} />
      </fieldset>
      <fieldset className={panel}>
        <legend className="px-1 text-lg font-semibold">รายละเอียดคำขอ</legend>
        <label className="grid gap-1.5 text-sm font-semibold">
          ประเภทความช่วยเหลือ
          <select className={field} value={assistanceType} onChange={(event) => setAssistanceType(event.target.value as SosAssistanceType)}>
            {Object.entries(assistanceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          จำนวนคน
          <input className={field} type="number" inputMode="numeric" required min={1} max={1000}
            value={people} onChange={(event) => setPeople(event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          รายละเอียดสมมติ (ไม่บังคับ)
          <textarea className={field} rows={3} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          ช่องทางติดต่อสมมติ (ไม่บังคับ)
          <input className={field} maxLength={120} value={contact} onChange={(event) => setContact(event.target.value)} />
        </label>
      </fieldset>
      {message && <p role="alert" className="text-sm text-red-800">{message}</p>}
      <button className={`${primary} justify-self-start`} type="submit">ตรวจทานคำขอ</button>
    </form>
  );
}
