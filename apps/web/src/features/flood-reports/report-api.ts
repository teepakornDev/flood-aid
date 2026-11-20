import type { CreateFloodReport, FloodBounds, FloodReportCollection, FloodReportReceipt } from "@floodaid/contracts";

const baseUrl = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000/api/v1").replace(/\/$/, "");

export class FloodReportRequestError extends Error {
  constructor(readonly status: number) {
    super("Flood report request failed");
  }
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}/flood-reports${path}`, {
    ...options,
    cache: "no-store",
  });
  if (!response.ok) throw new FloodReportRequestError(response.status);
  return response.json() as Promise<T>;
}

export async function fetchFloodReports(bounds: FloodBounds, signal: AbortSignal): Promise<FloodReportCollection> {
  const bbox = bounds.map((coordinate) => coordinate.toFixed(6)).join(",");
  const collection = await request<FloodReportCollection>(`?bbox=${bbox}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  });
  if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features) ||
      !Number.isFinite(Date.parse(collection.generatedAt))) {
    throw new Error("Invalid flood report collection");
  }
  return collection;
}

export async function submitFloodReport(report: CreateFloodReport): Promise<FloodReportReceipt> {
  const receipt = await request<FloodReportReceipt>("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
    signal: AbortSignal.timeout(8000),
  });
  if (typeof receipt?.id !== "string" || typeof receipt.createdAt !== "string") {
    throw new Error("Missing flood report receipt");
  }
  return receipt;
}
