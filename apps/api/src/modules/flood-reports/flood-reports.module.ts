import { Module } from "@nestjs/common";
import { FloodReportsController } from "./flood-reports.controller";
import { FloodReportsRepository } from "./flood-reports.repository";
import { FloodReportsService } from "./flood-reports.service";
import { FloodSubmissionGuard } from "./flood-submission.guard";

@Module({
  controllers: [FloodReportsController],
  providers: [FloodReportsRepository, FloodReportsService, FloodSubmissionGuard],
})
export class FloodReportsModule {}
