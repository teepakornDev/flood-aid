import type { Metadata } from "next";
import { FloodMap } from "../../../features/flood-reports/flood-map";
import { defaultCenter, readPoint } from "../../../features/flood-reports/report-display";

export const metadata: Metadata = { title: "แผนที่น้ำท่วม | FloodAid" };

export default async function MapPage({ searchParams }: {
  searchParams: Promise<{ lat?: string | string[]; lon?: string | string[] }>;
}) {
  const { lat, lon } = await searchParams;
  const center = typeof lat === "string" && typeof lon === "string" ? readPoint(lon, lat) : null;

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-7 sm:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">แผนที่น้ำท่วม</h1>
        <p className="mt-2 max-w-2xl text-slate-700">ข้อมูลจากการสังเกตของชุมชน ใช้ดูสถานการณ์เบื้องต้น กรุณาตรวจข้อมูลจากหน่วยงานในพื้นที่ก่อนตัดสินใจเดินทาง</p>
      </div>
      <FloodMap key={center?.join(",") ?? "default"} initialCenter={center ?? defaultCenter} />
    </main>
  );
}
