import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { databaseOptions } from "./database/database-options";
import { AuthModule } from "./modules/auth/auth.module";
import { FloodReportsModule } from "./modules/flood-reports/flood-reports.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({ ...databaseOptions(), retryAttempts: 1 }),
    }),
    HealthModule,
    FloodReportsModule,
    AuthModule,
  ],
})
export class AppModule {}
