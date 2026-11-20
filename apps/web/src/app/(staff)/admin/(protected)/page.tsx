import type { StaffRole } from "@floodaid/contracts";
import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffSession } from "../../../../features/staff-auth/server-session";
import { StaffSessionControls } from "../../../../features/staff-auth/staff-session-controls";

export const metadata: Metadata = { title: "พื้นที่เจ้าหน้าที่ | FloodAid" };

const roleLabels: Record<StaffRole, string> = {
  ADMIN: "ผู้ดูแลระบบ",
  COORDINATOR: "ผู้ประสานงาน",
  RESCUER: "เจ้าหน้าที่กู้ภัย",
};

export default async function StaffHomePage() {
  const session = await requireStaffSession();
  if (!session) return null;
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">พื้นที่เจ้าหน้าที่</h1>
      <section aria-label="บัญชีเจ้าหน้าที่" className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <p className="break-words text-lg font-semibold">{session.user.name}</p>
          <p className="text-sm text-slate-700">{roleLabels[session.user.role]}</p>
        </div>
        <StaffSessionControls remainingMs={Math.max(0, Date.parse(session.expiresAt) - Date.now())} />
      </section>
      <Link href="/map" className="min-h-11 justify-self-start py-2 font-semibold text-teal-800 underline">ดูแผนที่น้ำท่วม</Link>
    </main>
  );
}
