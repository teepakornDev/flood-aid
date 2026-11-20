import Link from "next/link";
import { checkApiHealth } from "../../lib/api/health";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const isAvailable = await checkApiHealth();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-12 sm:px-8 sm:py-20">
      <h1 className="text-4xl font-bold tracking-tight text-teal-950">รายงานน้ำท่วมจากชุมชน</h1>
      <p className="max-w-xl text-slate-700">ดูจุดที่มีคนรายงานน้ำท่วมล่าสุด หรือแบ่งปันสิ่งที่คุณสังเกตให้คนในพื้นที่ทราบ</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/map" className="inline-flex min-h-11 items-center rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900">เปิดแผนที่น้ำท่วม</Link>
        <Link href="/report/new" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 font-semibold hover:bg-slate-100">ส่งรายงานน้ำท่วม</Link>
      </div>
      <Link href="/sos/new" className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-teal-800 underline">ทดสอบการส่ง SOS</Link>
      <p className="text-sm text-slate-700">
        {isAvailable ? "เชื่อมต่อระบบได้" : "ระบบไม่พร้อมใช้งานในขณะนี้"}
      </p>
    </main>
  );
}
