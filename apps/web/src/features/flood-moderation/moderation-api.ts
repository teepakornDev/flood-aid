import type { FloodModerationPage, FloodReportReview, FloodReviewRequest, VerificationStatus } from "@floodaid/contracts";

const base = "/api/v1/admin/flood-reports";

export class ModerationError extends Error {
  constructor(readonly status: number) {
    super("Flood report moderation request failed");
  }
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(base + path, { ...options, cache: "no-store" });
  if (response.status === 401) window.location.replace("/admin/login?reason=expired");
  if (!response.ok) throw new ModerationError(response.status);
  return response.json() as Promise<T>;
}

export function getReviewQueue(status: VerificationStatus, cursor: string | null, signal: AbortSignal) {
  const query = new URLSearchParams({ status });
  if (cursor) query.set("cursor", cursor);
  return request<FloodModerationPage>(`?${query}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
}

export function getReportReview(id: string, signal: AbortSignal) {
  return request<FloodReportReview>(`/${id}/verification`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  });
}

export function submitReview(id: string, review: FloodReviewRequest) {
  return request<FloodReportReview>(`/${id}/verification`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(review),
    signal: AbortSignal.timeout(8000),
  });
}
