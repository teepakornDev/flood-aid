import type {
  FloodModerationPage, FloodModerationReport, FloodReportReview, FloodReviewDecision, FloodReviewReason,
  FloodReviewRequest, FloodReviewStatus, FloodSeverity, RoadStatus, VerificationStatus,
} from "@floodaid/contracts";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsString, IsUUID, Matches, ValidateIf } from "class-validator";

const decisions = ["VERIFIED", "REJECTED"] as const satisfies readonly FloodReviewStatus[];
const statuses = ["UNVERIFIED", ...decisions] as const satisfies readonly VerificationStatus[];
const reasons = [
  "FIELD_CONFIRMED", "TRUSTED_SOURCE", "INSUFFICIENT_EVIDENCE", "LOCATION_MISMATCH", "DUPLICATE_REPORT",
] as const satisfies readonly FloodReviewReason[];

export class FloodModerationQueryDto {
  @ApiPropertyOptional({ enum: statuses, default: "UNVERIFIED" })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(statuses)
  status?: VerificationStatus;

  @ApiPropertyOptional({ format: "uuid" })
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID("4")
  cursor?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 50, default: 20 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^(?:[1-9]|[1-4]\d|50)$/)
  limit?: string;
}

export class FloodReviewRequestDto implements FloodReviewRequest {
  @ApiProperty({ enum: decisions })
  @IsIn(decisions)
  verificationStatus!: FloodReviewStatus;

  @ApiProperty({ enum: reasons })
  @IsIn(reasons)
  reason!: FloodReviewReason;
}

class FloodReviewDecisionDto implements FloodReviewDecision {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  actorId!: string;

  @ApiProperty({ type: String, nullable: true })
  actorName!: string | null;

  @ApiProperty({ format: "date-time" })
  reviewedAt!: string;

  @ApiProperty({ enum: decisions })
  verificationStatus!: FloodReviewStatus;

  @ApiProperty({ enum: reasons })
  reason!: FloodReviewReason;
}

export class FloodReportReviewDto implements FloodReportReview {
  @ApiProperty({ format: "uuid" })
  reportId!: string;

  @ApiProperty({ type: FloodReviewDecisionDto, nullable: true })
  decision!: FloodReviewDecisionDto | null;
}

class FloodModerationReportDto implements FloodModerationReport {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"] })
  severity!: FloodSeverity;

  @ApiProperty({ enum: ["UNKNOWN", "PASSABLE", "IMPASSABLE"] })
  roadStatus!: RoadStatus;

  @ApiProperty({ enum: statuses })
  verificationStatus!: VerificationStatus;

  @ApiProperty({ format: "date-time" })
  observedAt!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ description: "Latitude rounded to the public grid" })
  latitude!: number;

  @ApiProperty({ description: "Longitude rounded to the public grid" })
  longitude!: number;

  @ApiProperty({ type: String, nullable: true, description: "Restricted to staff reviewers" })
  description!: string | null;
}

export class FloodModerationPageDto implements FloodModerationPage {
  @ApiProperty({ type: [FloodModerationReportDto] })
  reports!: FloodModerationReportDto[];

  @ApiProperty({ type: String, format: "uuid", nullable: true })
  nextCursor!: string | null;
}
