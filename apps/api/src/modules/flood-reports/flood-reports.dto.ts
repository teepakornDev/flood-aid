import type {
  CreateFloodReport, FloodReportCollection, FloodReportFeature, FloodReportReceipt,
  FloodSeverity, RoadStatus,
} from "@floodaid/contracts";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDefined, IsIn, IsISO8601, IsNumber, IsObject, IsString, Matches, Max, MaxLength, Min,
  ValidateIf, ValidateNested,
} from "class-validator";

const severities = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const satisfies readonly FloodSeverity[];
const roadStatuses = ["UNKNOWN", "PASSABLE", "IMPASSABLE"] as const satisfies readonly RoadStatus[];

class FloodLocationDto {
  @ApiProperty({ minimum: -90, maximum: 90, example: 7.01 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ minimum: -180, maximum: 180, example: 100.47 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100000 })
  @ValidateIf((_, value) => value !== undefined)
  @IsNumber()
  @Min(0)
  @Max(100000)
  accuracyMeters?: number;
}

export class CreateFloodReportDto implements CreateFloodReport {
  @ApiProperty({ type: FloodLocationDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => FloodLocationDto)
  location!: FloodLocationDto;

  @ApiProperty({ enum: severities })
  @IsIn(severities)
  severity!: FloodSeverity;

  @ApiProperty({ enum: roadStatuses })
  @IsIn(roadStatuses)
  roadStatus!: RoadStatus;

  @ApiProperty({ type: String, format: "date-time" })
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/)
  observedAt!: string;

  @ApiPropertyOptional({ maxLength: 500, description: "Private report note" })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class FloodReportQueryDto {
  @ApiProperty({ example: "100.3,6.9,100.6,7.2" })
  @IsString()
  @MaxLength(120)
  bbox!: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 500, default: 200 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @Matches(/^[1-9]\d{0,2}$/)
  limit?: string;
}

export class FloodReportReceiptDto implements FloodReportReceipt {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}

class FloodPointDto {
  @ApiProperty({ enum: ["Point"] })
  type!: "Point";

  @ApiProperty({ type: "array", items: { type: "number" }, minItems: 2, maxItems: 2, example: [100.47, 7.01] })
  coordinates!: [number, number];
}

class FloodReportPropertiesDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ enum: severities })
  severity!: FloodSeverity;

  @ApiProperty({ enum: roadStatuses })
  roadStatus!: RoadStatus;

  @ApiProperty({ enum: ["UNVERIFIED", "VERIFIED"] })
  verificationStatus!: FloodReportFeature["properties"]["verificationStatus"];

  @ApiProperty({ format: "date-time" })
  observedAt!: string;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ enum: ["COMMUNITY"] })
  source!: "COMMUNITY";
}

export class FloodReportFeatureDto implements FloodReportFeature {
  @ApiProperty({ enum: ["Feature"] })
  type!: "Feature";

  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ type: FloodPointDto })
  geometry!: FloodPointDto;

  @ApiProperty({ type: FloodReportPropertiesDto })
  properties!: FloodReportPropertiesDto;
}

export class FloodReportCollectionDto implements FloodReportCollection {
  @ApiProperty({ enum: ["FeatureCollection"] })
  type!: "FeatureCollection";

  @ApiProperty({ type: [FloodReportFeatureDto] })
  features!: FloodReportFeatureDto[];

  @ApiProperty({ format: "date-time" })
  generatedAt!: string;

  @ApiProperty()
  limitReached!: boolean;
}
