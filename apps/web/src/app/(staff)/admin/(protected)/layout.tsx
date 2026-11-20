import Link from "next/link";
import type { ReactNode } from "react";
import { requireStaffSession } from "../../../../features/staff-auth/server-session";

export default async function ProtectedStaffLayout({ children }: { children: ReactNode }) {
  const session = await requireStaffSession();
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <nav aria-label="เมนูเจ้าหน้าที่" className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-bold text-teal-950">FloodAid</Link>
          <span className="text-sm font-semibold text-slate-700">สำหรับเจ้าหน้าที่</span>
        </nav>
      </header>
      {session ? children : (
        <main className="mx-auto grid w-full max-w-5xl gap-3 px-4 py-8">
          <h1 className="text-2xl font-bold">เชื่อมต่อระบบเจ้าหน้าที่ไม่ได้</h1>
          <p>ลองโหลดหน้านี้ใหม่อีกครั้ง</p>
          <form method="get" action="/admin">
            <button type="submit" className="min-h-11 py-2 font-semibold text-teal-800 underline">โหลดใหม่</button>
          </form>
        </main>
      )}
    </>
  );
}
