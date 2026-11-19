import { join } from "node:path";
import type { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { portEnv, requiredEnv } from "../common/environment";

export function databaseOptions(): PostgresConnectionOptions {
  return {
    type: "postgres",
    host: requiredEnv("DATABASE_HOST"),
    port: portEnv("DATABASE_PORT"),
    username: requiredEnv("DATABASE_USERNAME"),
    password: requiredEnv("DATABASE_PASSWORD"),
    database: requiredEnv("DATABASE_NAME"),
    connectTimeoutMS: 2000,
    synchronize: false,
    migrationsRun: false,
    installExtensions: false,
    uuidExtension: "pgcrypto",
    migrations: [join(__dirname, "migrations", "*.js")],
  };
}
