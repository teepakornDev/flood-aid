import type { Metadata } from "next";
import Link from "next/link";
import { StaffLoginForm } from "../../../../features/staff-auth/staff-login-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบเจ้าหน้าที่ | FloodAid" };

export default async function StaffLoginPage({ searchParams }: {
  searchParams: Promise<{ reason?: string | string[] }>;
}) {
  const { reason } = await searchParams;
  return (
    <main className="mx-auto grid w-full max-w-md gap-5 px-4 py-10 sm:px-6">
      <Link href="/" className="justify-self-start py-2 font-bold text-teal-950">FloodAid</Link>
      <h1 className="text-3xl font-bold tracking-tight">เข้าสู่ระบบเจ้าหน้าที่</h1>
      <StaffLoginForm expired={reason === "expired"} />
    </main>
  );
}
