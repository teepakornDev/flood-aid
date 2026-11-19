import type { HealthErrorResponse, HealthResponse } from "@floodaid/contracts";
import { Controller, Get, Header, Logger, Res, ServiceUnavailableException } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { HealthDto, HealthErrorDto } from "./health.dto";
import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly health: HealthService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Check API and PostGIS readiness" })
  @ApiOkResponse({ type: HealthDto })
  @ApiServiceUnavailableResponse({ type: HealthErrorDto })
  async getHealth(@Res({ passthrough: true }) response: Response): Promise<HealthResponse> {
    if (!(await this.health.isReady())) {
      const requestId = String(response.getHeader("X-Request-Id"));
      this.logger.warn({ message: "PostGIS readiness check failed", requestId });

      const body: HealthErrorResponse = {
        error: {
          code: "SERVICE_UNAVAILABLE",
          message: "Service temporarily unavailable",
          requestId,
        },
      };
      throw new ServiceUnavailableException(body);
    }

    return { status: "ok" };
  }
}
