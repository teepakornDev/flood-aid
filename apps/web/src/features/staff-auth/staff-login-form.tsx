"use client";

import { type FormEvent, useState } from "react";

const field = "min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal";

export function StaffLoginForm({ expired }: { expired: boolean }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = new FormData(event.currentTarget);
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        window.location.replace("/admin");
        return;
      }
      setMessage(response.status === 401 ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
        : response.status === 429 ? "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่"
        : "เข้าสู่ระบบไม่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
    } catch {
      setMessage("เชื่อมต่อระบบไม่ได้ กรุณาตรวจการเชื่อมต่อแล้วลองอีกครั้ง");
    }
    setSaving(false);
  }

  return (
    <form method="post" onSubmit={(event) => void login(event)} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      {expired && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง</p>}
      <label className="grid gap-1.5 text-sm font-semibold">
        อีเมลเจ้าหน้าที่
        <input type="email" name="email" autoComplete="username" required maxLength={254} className={field} />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        รหัสผ่าน
        <input type="password" name="password" autoComplete="current-password" required maxLength={128} className={field} />
      </label>
      {message && <p role="alert" className="text-sm text-red-800">{message}</p>}
      <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
        {saving ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
