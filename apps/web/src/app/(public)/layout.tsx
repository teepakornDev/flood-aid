import Link from "next/link";
import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <nav aria-label="เมนูหลัก" className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 px-4 sm:px-8">
          <Link className="py-3 text-lg font-bold tracking-tight text-teal-950" href="/">FloodAid</Link>
          <div className="flex flex-wrap items-center gap-x-5 text-sm font-semibold">
            <Link className="inline-flex min-h-11 items-center text-slate-800 hover:text-teal-800" href="/map">แผนที่น้ำท่วม</Link>
            <Link className="inline-flex min-h-11 items-center text-teal-800 hover:underline" href="/report/new">ส่งรายงาน</Link>
            <Link className="inline-flex min-h-11 items-center text-slate-700 hover:text-teal-800" href="/admin">เจ้าหน้าที่</Link>
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}
