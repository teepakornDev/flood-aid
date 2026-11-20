export interface HealthResponse {
  status: "ok";
}

export interface HealthErrorResponse {
  error: {
    code: "SERVICE_UNAVAILABLE";
    message: string;
    requestId: string;
  };
}

export type FloodSeverity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type RoadStatus = "UNKNOWN" | "PASSABLE" | "IMPASSABLE";
export type VerificationStatus = "UNVERIFIED" | "VERIFIED" | "REJECTED";
export type FloodBounds = [west: number, south: number, east: number, north: number];

export interface CreateFloodReport {
  location: { latitude: number; longitude: number; accuracyMeters?: number };
  severity: FloodSeverity;
  roadStatus: RoadStatus;
  observedAt: string;
  description?: string;
}

export interface FloodReportReceipt {
  id: string;
  createdAt: string;
}

export interface FloodReportFeature {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [longitude: number, latitude: number] };
  properties: {
    id: string;
    severity: FloodSeverity;
    roadStatus: RoadStatus;
    verificationStatus: Exclude<VerificationStatus, "REJECTED">;
    observedAt: string;
    createdAt: string;
    source: "COMMUNITY";
  };
}

export interface FloodReportCollection {
  type: "FeatureCollection";
  features: FloodReportFeature[];
  generatedAt: string;
  limitReached: boolean;
}

export type StaffRole = "ADMIN" | "COORDINATOR" | "RESCUER";

export interface StaffUser {
  id: string;
  name: string;
  role: StaffRole;
}

export interface StaffSession {
  user: StaffUser;
  expiresAt: string;
}
