import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class HealthService {
  constructor(private readonly database: DataSource) {}

  async isReady(): Promise<boolean> {
    try {
      await this.database.query("SELECT PostGIS_Version()");
      return true;
    } catch {
      return false;
    }
  }
}
