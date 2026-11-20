import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Query, Req, Res } from "@nestjs/common";
import {
  ApiBadRequestResponse, ApiConflictResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse,
  ApiServiceUnavailableResponse, ApiTags, ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";
import { RequireStaffRoles } from "../auth/staff-auth.guards";
import type { AuthenticatedStaffRequest } from "../auth/staff-session";
import {
  FloodModerationPageDto, FloodModerationQueryDto, FloodReportReviewDto, FloodReviewRequestDto,
} from "./flood-moderation.dto";
import { FloodModerationService } from "./flood-moderation.service";

@ApiTags("Flood Report Moderation")
@ApiUnauthorizedResponse({ description: "Staff session required" })
@ApiForbiddenResponse({ description: "Staff role or request origin denied" })
@ApiBadRequestResponse({ description: "Invalid review input, cursor, limit or report ID" })
@ApiServiceUnavailableResponse({ description: "Moderation temporarily unavailable" })
@RequireStaffRoles("ADMIN", "COORDINATOR")
@Controller("admin/flood-reports")
export class FloodModerationController {
  constructor(private readonly moderation: FloodModerationService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: FloodModerationPageDto })
  list(@Query() query: FloodModerationQueryDto): Promise<FloodModerationPageDto> {
    return this.moderation.list(query);
  }

  @Get(":id/verification")
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: FloodReportReviewDto })
  @ApiNotFoundResponse({ description: "Report not found" })
  review(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string): Promise<FloodReportReviewDto> {
    return this.moderation.review(id);
  }

  @Patch(":id/verification")
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: FloodReportReviewDto, description: "Decision recorded or identical retry replayed" })
  @ApiNotFoundResponse({ description: "Report not found" })
  @ApiConflictResponse({ description: "The report has already been reviewed" })
  verify(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() review: FloodReviewRequestDto,
    @Req() request: AuthenticatedStaffRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<FloodReportReviewDto> {
    const requestId = response.getHeader("X-Request-Id");
    return this.moderation.verify(id, request.staff.user, typeof requestId === "string" ? requestId : null, review);
  }
}
