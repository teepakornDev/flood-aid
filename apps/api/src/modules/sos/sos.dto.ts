import type { CreateSosRequest, SosAssistanceType, SosPrivateStatus, SosReceipt, SosStatus } from "@floodaid/contracts";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDefined, IsIn, IsInt, IsNumber, IsObject, IsString, Max, MaxLength, Min, ValidateIf, ValidateNested,
} from "class-validator";

const assistance = ["EVACUATION", "FOOD", "WATER", "MEDICAL"] as const satisfies readonly SosAssistanceType[];
const statuses = [
  "SUBMITTED", "TRIAGED", "ASSIGNED", "EN_ROUTE", "RESOLVED", "CANCELLED", "UNABLE_TO_REACH",
] as const satisfies readonly SosStatus[];

class SosLocationDto {
  @ApiProperty({ minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ minimum: -180, maximum: 180 })
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

export class CreateSosDto implements CreateSosRequest {
  @ApiProperty({ type: SosLocationDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => SosLocationDto)
  location!: SosLocationDto;

  @ApiProperty({ enum: assistance })
  @IsIn(assistance)
  assistanceType!: SosAssistanceType;

  @ApiProperty({ minimum: 1, maximum: 1000 })
  @IsInt()
  @Min(1)
  @Max(1000)
  peopleCount!: number;

  @ApiPropertyOptional({ maxLength: 500 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(120)
  contact?: string;
}

export class SosReceiptDto implements SosReceipt {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ enum: ["SUBMITTED"], description: "Persisted by the server" })
  status!: "SUBMITTED";

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ description: "Private bearer credential. Keep it out of URLs and logs." })
  trackingToken!: string;
}

export class SosPrivateStatusDto implements SosPrivateStatus {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ enum: statuses })
  status!: SosStatus;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;

  @ApiProperty({ format: "date-time" })
  updatedAt!: string;
}

export class SosIntakeDto {
  @ApiProperty()
  enabled!: boolean;
}
