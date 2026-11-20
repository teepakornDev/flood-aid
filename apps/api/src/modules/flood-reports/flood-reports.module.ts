import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { FloodModerationController } from "./flood-moderation.controller";
import { FloodModerationRepository } from "./flood-moderation.repository";
import { FloodModerationService } from "./flood-moderation.service";
import { FloodReportsController } from "./flood-reports.controller";
import { FloodReportsRepository } from "./flood-reports.repository";
import { FloodReportsService } from "./flood-reports.service";
import { FloodSubmissionGuard } from "./flood-submission.guard";

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [FloodReportsController, FloodModerationController],
  providers: [
    FloodReportsRepository, FloodReportsService, FloodSubmissionGuard, FloodModerationRepository, FloodModerationService,
  ],
})
export class FloodReportsModule {}
