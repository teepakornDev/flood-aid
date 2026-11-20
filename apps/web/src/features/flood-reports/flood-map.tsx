"use client";

import type { FloodBounds, FloodReportCollection, FloodReportFeature, FloodSeverity } from "@floodaid/contracts";
import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ObservationMap } from "../../components/map/observation-map";
import { CoordinateFields, coordinateFields } from "./coordinate-fields";
import { fetchFloodReports } from "./report-api";
import { formatObservationTime, type MapPoint, nearbyBounds, readPoint, roadLabels, severityLabels } from "./report-display";

const severityColors: Record<FloodSeverity, string> = {
  LOW: "bg-teal-100 text-teal-900",
  MODERATE: "bg-amber-100 text-amber-950",
  HIGH: "bg-orange-100 text-orange-950",
  CRITICAL: "bg-red-100 text-red-950",
};
const refreshButton = "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-100";

type ListResult = {
  bounds: FloodBounds;
  refresh: number;
  reports: FloodReportCollection | null;
};

function ReportCard({ feature, generatedAt }: { feature: FloodReportFeature; generatedAt: string }) {
  const { severity, verificationStatus, observedAt, roadStatus } = feature.properties;
  const [longitude, latitude] = feature.geometry.coordinates;
  const minutes = Math.max(0, Math.floor((Date.parse(generatedAt) - Date.parse(observedAt)) / 60_000));
  const age = minutes === 0 ? "เมื่อสักครู่" : minutes < 60 ? `${minutes} นาทีที่แล้ว` : `${Math.floor(minutes / 60)} ชั่วโมงที่แล้ว`;
  const verified = verificationStatus === "VERIFIED";

  return (
    <li id={`report-${feature.id}`} tabIndex={-1} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4 focus:outline-2 focus:outline-teal-800">
      <div className="flex flex-wrap gap-2">
        <span className={`rounded-md px-2 py-1 text-xs font-bold ${severityColors[severity]}`}>น้ำท่วม{severityLabels[severity]}</span>
        <span className={`rounded-md px-2 py-1 text-xs font-bold ${verified ? "bg-teal-100 text-teal-950" : "bg-amber-50 text-amber-950"}`}>
          {verified ? "ตรวจสอบแล้ว" : "ยังไม่ตรวจสอบ"}
        </span>
        {minutes >= 360 && <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">ข้อมูลเกิน 6 ชั่วโมง</span>}
      </div>
      <p className="font-semibold">{roadLabels[roadStatus]}</p>
      <p className="text-sm text-slate-700">
        รายงานชุมชน · <time dateTime={observedAt}>{formatObservationTime(observedAt)}</time> · {age}
      </p>
      <p className="text-xs text-slate-600">พิกัดโดยประมาณ {latitude.toFixed(3)}, {longitude.toFixed(3)}</p>
    </li>
  );
}

export function FloodMap({ initialCenter }: { initialCenter: MapPoint }) {
  const [center, setCenter] = useState(initialCenter);
  const [coordinates, setCoordinates] = useState(coordinateFields(initialCenter));
  const [bounds, setBounds] = useState(() => nearbyBounds(initialCenter));
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<ListResult | null>(null);
  const [coordinateError, setCoordinateError] = useState(false);
  const canQuery = bounds[2] > bounds[0] && bounds[3] > bounds[1] &&
    bounds[2] - bounds[0] <= 2 && bounds[3] - bounds[1] <= 2;

  useEffect(() => {
    if (!canQuery) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetchFloodReports(bounds, controller.signal).then((reports) => {
        if (!controller.signal.aborted) setResult({ bounds, refresh, reports });
      }).catch(() => {
        if (!controller.signal.aborted) setResult({ bounds, refresh, reports: null });
      });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bounds, canQuery, refresh]);

  useEffect(() => {
    const refreshVisible = () => {
      if (document.visibilityState === "visible") setRefresh((value) => value + 1);
    };
    const timer = setInterval(refreshVisible, 60_000);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, []);

  const activeResult = result?.bounds === bounds ? result : null;
  const collection = activeResult?.reports;
  const updateBounds = useCallback((next: FloodBounds) => {
    setBounds((current) => current.every((coordinate, index) => Math.abs(coordinate - next[index]) < 0.000001) ? current : next);
  }, []);
  const selectReport = useCallback((id: string) => {
    document.getElementById(`report-${id}`)?.focus();
  }, []);

  function goToArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const point = readPoint(...coordinates);
    setCoordinateError(!point);
    if (point) {
      setCenter(point);
      setBounds(nearbyBounds(point));
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section aria-label="พื้นที่บนแผนที่" className="min-w-0">
        <ObservationMap center={center} reports={collection?.features} onBoundsChange={updateBounds} onSelectReport={selectReport} />
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
          <span className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-full bg-[#a94d14]" />ยังไม่ตรวจสอบ</span>
          <span className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 rounded-full bg-[#08786a]" />ตรวจสอบแล้ว</span>
        </div>
        <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer font-semibold">ค้นหาบริเวณด้วยพิกัด</summary>
          <form className="mt-3 grid gap-3" onSubmit={goToArea}>
            <CoordinateFields value={coordinates} onChange={setCoordinates} />
            {coordinateError && <p role="alert" className="text-sm text-red-800">กรอกละติจูดและลองจิจูดที่ใช้ได้</p>}
            <button className={`${refreshButton} justify-self-start`} type="submit">ดูบริเวณนี้</button>
          </form>
        </details>
      </section>

      <section aria-labelledby="nearby-reports" className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="nearby-reports" className="text-lg font-bold">รายงานในบริเวณนี้</h2>
          <button type="button" className={refreshButton} onClick={() => setRefresh((value) => value + 1)}>โหลดใหม่</button>
        </div>
        <p className="mt-1 text-sm text-slate-600">แสดงรายงานที่สังเกตใน 24 ชั่วโมงล่าสุด</p>
        <div className="mt-3 text-sm text-slate-700" role="status">
          {!canQuery && "ซูมเข้าเพื่อดูรายงานในพื้นที่เล็กลง"}
          {canQuery && !collection && activeResult?.refresh !== refresh && "กำลังโหลดรายงาน…"}
          {activeResult?.refresh === refresh && !collection && "โหลดรายงานไม่สำเร็จ กดโหลดใหม่เพื่อลองอีกครั้ง"}
          {collection && (
            <span>{collection.limitReached ? "แสดงรายงานล่าสุดบางส่วน" : `${collection.features.length} รายงาน`} · อัปเดต {formatObservationTime(collection.generatedAt)} (เวลาไทย)</span>
          )}
        </div>
        {collection?.features.length === 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
            <p>ยังไม่มีรายงานล่าสุดในพื้นที่นี้</p>
            <Link className="mt-2 inline-block font-semibold text-teal-800 underline" href="/report/new">รายงานจุดที่พบน้ำท่วม</Link>
          </div>
        )}
        {collection && collection.features.length > 0 && (
          <ul className="mt-3 grid gap-3">
            {collection.features.map((feature) => <ReportCard key={feature.id} feature={feature} generatedAt={collection.generatedAt} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
