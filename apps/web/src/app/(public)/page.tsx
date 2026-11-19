import { checkApiHealth } from "../../lib/api/health";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const isAvailable = await checkApiHealth();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-10">
      <h1 className="text-3xl font-semibold">FloodAid</h1>
      <p className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-base leading-relaxed">
        {isAvailable ? "เชื่อมต่อระบบได้" : "ระบบไม่พร้อมใช้งานในขณะนี้"}
      </p>
    </main>
  );
}
