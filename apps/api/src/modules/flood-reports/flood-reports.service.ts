import { createHash } from "node:crypto";
import type { FloodBounds, FloodReportCollection, FloodReportFeature, FloodReportReceipt } from "@floodaid/contracts";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { CreateFloodReportDto, FloodReportQueryDto } from "./flood-reports.dto";
import { FloodReportsRepository, type PublicReportRow } from "./flood-reports.repository";

const freshnessWindowMs = 24 * 60 * 60 * 1000;
const clockSkewMs = 5 * 60 * 1000;
const coordinate = /^-?\d+(?:\.\d+)?$/;

function parseBounds(value: string): FloodBounds {
  const values = value.split(",");
  if (values.length !== 4 || !values.every((part) => coordinate.test(part))) {
    throw new BadRequestException("bbox must contain west,south,east,north coordinates.");
  }
  const [west, south, east, north] = values.map(Number);
  if (west < -180 || east > 180 || south < -90 || north > 90 ||
      west >= east || south >= north || east - west > 2 || north - south > 2) {
    throw new BadRequestException("bbox must be ordered, within coordinate bounds, and at most 2 degrees per side.");
  }
  return [west, south, east, north];
}

function toFeature(report: PublicReportRow): FloodReportFeature {
  const { id, geometry, severity, roadStatus, verificationStatus, observedAt, createdAt } = report;
  return {
    type: "Feature",
    id,
    geometry,
    properties: {
      id, severity, roadStatus, verificationStatus, source: "COMMUNITY",
      observedAt: observedAt.toISOString(), createdAt: createdAt.toISOString(),
    },
  };
}

@Injectable()
export class FloodReportsService {
  constructor(private readonly reports: FloodReportsRepository) {}

  async create(report: CreateFloodReportDto): Promise<FloodReportReceipt> {
    const observedAt = new Date(report.observedAt);
    if (!Number.isFinite(observedAt.getTime()) || observedAt.getUTCFullYear() < 1 ||
        observedAt.getTime() > Date.now() + clockSkewMs) {
      throw new BadRequestException("observedAt must be valid and at most 5 minutes in the future.");
    }

    const description = report.description?.trim() || undefined;
    if (description?.includes("\0")) throw new BadRequestException("description contains invalid characters.");
    const normalizedTime = observedAt.toISOString();
    const fingerprint = createHash("sha256").update(JSON.stringify([
      report.location.longitude, report.location.latitude, report.severity, report.roadStatus,
      normalizedTime, description ?? null,
    ])).digest();

    const saved = await this.reports.save({ ...report, observedAt: normalizedTime, description }, fingerprint);
    return { id: saved.id, createdAt: saved.createdAt.toISOString() };
  }

  async list(query: FloodReportQueryDto): Promise<FloodReportCollection> {
    const bounds = parseBounds(query.bbox);
    const limit = Number(query.limit ?? 200);
    if (limit < 1 || limit > 500) throw new BadRequestException("limit must be between 1 and 500.");

    const now = new Date();
    const reports = await this.reports.list(bounds, new Date(now.getTime() - freshnessWindowMs), limit + 1);
    return {
      type: "FeatureCollection",
      features: reports.slice(0, limit).map(toFeature),
      generatedAt: now.toISOString(),
      limitReached: reports.length > limit,
    };
  }

  async detail(id: string): Promise<FloodReportFeature> {
    const report = await this.reports.find(id, new Date(Date.now() - freshnessWindowMs));
    if (!report) throw new NotFoundException("Flood report not found.");
    return toFeature(report);
  }
}
