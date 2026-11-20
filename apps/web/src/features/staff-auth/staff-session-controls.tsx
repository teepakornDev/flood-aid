"use client";

import { useEffect, useState } from "react";

export function StaffSessionControls({ remainingMs }: { remainingMs: number }) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => window.location.replace("/admin/login?reason=expired"), remainingMs);
    return () => clearTimeout(timer);
  }, [remainingMs]);

  async function logout() {
    setSaving(true);
    setFailed(false);
    try {
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok || response.status === 401) {
        window.location.replace("/admin/login");
        return;
      }
    } catch {
      // Keep the current page if revocation cannot be confirmed.
    }
    setSaving(false);
    setFailed(true);
  }

  return (
    <div className="grid justify-items-start gap-2">
      <button type="button" disabled={saving} onClick={() => void logout()}
        className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-100 disabled:opacity-60">
        {saving ? "กำลังออกจากระบบ…" : "ออกจากระบบ"}
      </button>
      {failed && <p role="alert" className="text-sm text-red-800">ยืนยันการออกจากระบบไม่ได้ กรุณาลองอีกครั้ง</p>}
    </div>
  );
}
