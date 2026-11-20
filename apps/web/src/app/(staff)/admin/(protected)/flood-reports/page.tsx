import type { Metadata } from "next";
import Link from "next/link";
import { FloodModerationQueue } from "../../../../../features/flood-moderation/flood-moderation-queue";
import { requireStaffSession } from "../../../../../features/staff-auth/server-session";

export const metadata: Metadata = { title: "ตรวจสอบรายงานน้ำท่วม | FloodAid" };

export default async function FloodModerationPage() {
  const session = await requireStaffSession();
  if (!session) return null;
  const canReview = session.user.role === "ADMIN" || session.user.role === "COORDINATOR";

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-8">
      <Link href="/admin" className="justify-self-start text-sm font-semibold text-teal-800 underline">พื้นที่เจ้าหน้าที่</Link>
      <h1 className="text-3xl font-bold tracking-tight">ตรวจสอบรายงานน้ำท่วม</h1>
      {canReview ? <FloodModerationQueue /> : <p role="alert">บัญชีนี้ไม่มีสิทธิ์ตรวจสอบรายงาน</p>}
    </main>
  );
}
