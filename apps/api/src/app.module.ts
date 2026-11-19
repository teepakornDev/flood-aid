import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { databaseOptions } from "./database/database-options";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({ ...databaseOptions(), retryAttempts: 1 }),
    }),
    HealthModule,
  ],
})
export class AppModule {}
