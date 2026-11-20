import type { Metadata } from "next";
import Link from "next/link";
import { sosIntakeEnabled } from "../../../../features/sos/sos-api";
import { SosForm } from "../../../../features/sos/sos-form";
import { SosNotice } from "../../../../features/sos/sos-notice";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "ทดสอบการส่ง SOS | FloodAid", referrer: "no-referrer" };

export default async function NewSosPage() {
  const enabled = await sosIntakeEnabled();
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-5 px-4 py-7 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight">ทดสอบการส่ง SOS</h1>
      <SosNotice />
      {enabled ? <SosForm /> : (
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-4">ขณะนี้ระบบปิดรับคำขอทดสอบ</p>
      )}
      <Link href="/sos" className="inline-flex min-h-11 items-center justify-self-start text-sm font-semibold text-teal-800 underline">
        ติดตามคำขอทดสอบ
      </Link>
    </main>
  );
}
