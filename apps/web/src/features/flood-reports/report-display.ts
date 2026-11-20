import type { FloodBounds, FloodSeverity, RoadStatus } from "@floodaid/contracts";

export type MapPoint = [longitude: number, latitude: number];
export const defaultCenter: MapPoint = [100.47, 7.01];

export const severityLabels: Record<FloodSeverity, string> = {
  LOW: "เล็กน้อย",
  MODERATE: "ปานกลาง",
  HIGH: "สูง",
  CRITICAL: "รุนแรง",
};

export const roadLabels: Record<RoadStatus, string> = {
  UNKNOWN: "ไม่ทราบสภาพถนน",
  PASSABLE: "มีผู้รายงานว่าผ่านได้",
  IMPASSABLE: "มีผู้รายงานว่าผ่านไม่ได้",
};

export function readPoint(longitude: string, latitude: string): MapPoint | null {
  if (!longitude.trim() || !latitude.trim()) return null;
  const lon = Number(longitude);
  const lat = Number(latitude);
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180 || Math.abs(lat) > 90) return null;
  return [lon, lat];
}

export function nearbyBounds([lon, lat]: MapPoint): FloodBounds {
  return [Math.max(-180, lon - 0.2), Math.max(-90, lat - 0.2), Math.min(180, lon + 0.2), Math.min(90, lat + 0.2)];
}

export function formatObservationTime(date: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(date));
}
