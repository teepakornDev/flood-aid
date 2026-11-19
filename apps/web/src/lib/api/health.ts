import type { HealthResponse } from "@floodaid/contracts";

export async function checkApiHealth(): Promise<boolean> {
  const apiUrl = URL.parse(process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000/api/v1");
  if (!apiUrl || !["http:", "https:"].includes(apiUrl.protocol)) return false;

  apiUrl.pathname = `${apiUrl.pathname.replace(/\/$/, "")}/health`;

  try {
    const response = await fetch(apiUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) return false;

    const data: Partial<HealthResponse> | null = await response.json();
    return data?.status === "ok";
  } catch {
    return false;
  }
}
