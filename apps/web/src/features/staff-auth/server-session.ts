import type { StaffSession } from "@floodaid/contracts";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000/api/v1").replace(/\/$/, "");
const staffCookie = "floodaid_staff";

export const requireStaffSession = cache(async (): Promise<StaffSession | null> => {
  const token = (await cookies()).get(staffCookie)?.value;
  if (!token) redirect("/admin/login");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) redirect("/admin/login?reason=expired");

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/auth/me`, {
      headers: { Cookie: `${staffCookie}=${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return null;
  }
  if (response.status === 401) redirect("/admin/login?reason=expired");
  if (!response.ok) return null;
  try {
    const session = await response.json() as StaffSession;
    if (!session?.user?.id || !Number.isFinite(Date.parse(session.expiresAt))) return null;
    return session;
  } catch {
    return null;
  }
});
