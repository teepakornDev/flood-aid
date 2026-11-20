import type { CreateSosRequest, SosPrivateStatus, SosReceipt } from "@floodaid/contracts";

const api = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000/api/v1").replace(/\/$/, "");
export const caseIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const sosCredentialPattern = /^[A-Za-z0-9_-]{43}$/;
const statuses = ["SUBMITTED", "TRIAGED", "ASSIGNED", "EN_ROUTE", "RESOLVED", "CANCELLED", "UNABLE_TO_REACH"];

export class SosRequestError extends Error {
  constructor(readonly status: number, readonly code?: string) {
    super("Private SOS request failed");
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${api}/sos${path}`, {
    ...options, cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { code?: string } | null;
    throw new SosRequestError(response.status, body?.code);
  }
  return response.json() as Promise<T>;
}

export async function sosIntakeEnabled(): Promise<boolean> {
  try {
    return (await request<{ enabled: boolean }>("/intake")).enabled === true;
  } catch {
    return false;
  }
}

export function newSosKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sendSos(payload: CreateSosRequest, key: string): Promise<SosReceipt> {
  const receipt = await request<SosReceipt>("", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(payload),
  });
  if (!receipt || !caseIdPattern.test(receipt.id) || !sosCredentialPattern.test(receipt.trackingToken) ||
      receipt.status !== "SUBMITTED" || !Number.isFinite(Date.parse(receipt.createdAt))) {
    throw new Error("Committed SOS receipt missing");
  }
  return receipt;
}

export async function trackSos(id: string, token: string): Promise<SosPrivateStatus> {
  const status = await request<SosPrivateStatus>(`/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!status || status.id.toLowerCase() !== id.toLowerCase() || !statuses.includes(status.status) ||
      !Number.isFinite(Date.parse(status.createdAt)) || !Number.isFinite(Date.parse(status.updatedAt))) {
    throw new Error("Private status unavailable");
  }
  return status;
}
