"use client";

import { type FormEvent, useId, useState } from "react";

const field = "min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal";

export function StaffLoginForm({ expired }: { expired: boolean }) {
  const passwordId = useId();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const passwordAction = passwordVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน";

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
      <div className="grid gap-1.5 text-sm">
        <label htmlFor={passwordId} className="font-semibold">รหัสผ่าน</label>
        <div className="relative">
          <input
            id={passwordId}
            type={passwordVisible ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={128}
            className={`${field} pr-12 [&::-ms-reveal]:hidden`}
          />
          <button
            type="button"
            aria-label={passwordAction}
            aria-controls={passwordId}
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-800"
          >
            <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              {passwordVisible ? (
                <path d="m3 3 18 18M10.7 10.7a2 2 0 0 0 2.6 2.6M9.9 5.2A10 10 0 0 1 12 5c4.4 0 8 3 10 7a13 13 0 0 1-2.7 3.5M6.2 6.8A14 14 0 0 0 2 12c2 4 5.6 7 10 7 1.7 0 3.3-.5 4.7-1.3" />
              ) : (
                <>
                  <path d="M2 12c2-4 5.6-7 10-7s8 3 10 7c-2 4-5.6 7-10 7S4 16 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      {message && <p role="alert" className="text-sm text-red-800">{message}</p>}
      <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-teal-800 px-4 font-semibold text-white hover:bg-teal-900 disabled:opacity-60">
        {saving ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
