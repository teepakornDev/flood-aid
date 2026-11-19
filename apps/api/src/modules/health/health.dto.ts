import type { HealthErrorResponse, HealthResponse } from "@floodaid/contracts";
import { ApiProperty } from "@nestjs/swagger";

export class HealthDto implements HealthResponse {
  @ApiProperty({ enum: ["ok"] })
  status!: HealthResponse["status"];
}

class HealthErrorDetailsDto {
  @ApiProperty({ enum: ["SERVICE_UNAVAILABLE"] })
  code!: HealthErrorResponse["error"]["code"];

  @ApiProperty({ example: "Service temporarily unavailable" })
  message!: string;

  @ApiProperty({ format: "uuid" })
  requestId!: string;
}

export class HealthErrorDto implements HealthErrorResponse {
  @ApiProperty({ type: HealthErrorDetailsDto })
  error!: HealthErrorDetailsDto;
}
