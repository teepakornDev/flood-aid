import {
  Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Query, UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiResponse,
  ApiServiceUnavailableResponse, ApiTags,
} from "@nestjs/swagger";
import {
  CreateFloodReportDto, FloodReportCollectionDto, FloodReportFeatureDto, FloodReportQueryDto, FloodReportReceiptDto,
} from "./flood-reports.dto";
import { FloodReportsService } from "./flood-reports.service";
import { FloodSubmissionGuard } from "./flood-submission.guard";

@ApiTags("Flood Reports")
@ApiBadRequestResponse({ description: "Invalid report fields, bounds, limit or report ID" })
@ApiServiceUnavailableResponse({ description: "Flood reports are temporarily unavailable" })
@Controller("flood-reports")
export class FloodReportsController {
  constructor(private readonly reports: FloodReportsService) {}

  @Post()
  @Header("Cache-Control", "no-store")
  @UseGuards(FloodSubmissionGuard)
  @ApiCreatedResponse({ type: FloodReportReceiptDto, description: "Saved or previously saved identical report" })
  @ApiResponse({ status: 429, description: "Submission rate limit exceeded" })
  create(@Body() report: CreateFloodReportDto): Promise<FloodReportReceiptDto> {
    return this.reports.create(report);
  }

  @Get()
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: FloodReportCollectionDto })
  list(@Query() query: FloodReportQueryDto): Promise<FloodReportCollectionDto> {
    return this.reports.list(query);
  }

  @Get(":id")
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({ type: FloodReportFeatureDto })
  @ApiNotFoundResponse({ description: "Report missing, rejected or outside the public freshness window" })
  detail(@Param("id", new ParseUUIDPipe({ version: "4" })) id: string): Promise<FloodReportFeatureDto> {
    return this.reports.detail(id);
  }
}
