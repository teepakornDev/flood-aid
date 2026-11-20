import type { Metadata } from "next";
import { ReportForm } from "../../../../features/flood-reports/report-form";

export const metadata: Metadata = { title: "ส่งรายงานน้ำท่วม | FloodAid" };

export default function NewFloodReportPage() {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-7 sm:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ส่งรายงานน้ำท่วม</h1>
        <p className="mt-2 text-slate-700">บอกชุมชนว่าพบน้ำท่วมที่ไหนและเมื่อไร โดยไม่ต้องเข้าสู่ระบบ</p>
      </div>
      <ReportForm />
    </main>
  );
}
