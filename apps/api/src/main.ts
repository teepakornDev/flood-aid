import "reflect-metadata";
import { ConsoleLogger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./common/configure-app";
import { EnvironmentError, readApiConfig } from "./common/environment";

const logger = new ConsoleLogger({ json: true });

async function bootstrap(): Promise<void> {
  const { host, port, webOrigin } = readApiConfig();
  const app = await NestFactory.create(AppModule, { abortOnError: false, logger });
  try {
    configureApp(app, webOrigin);
    app.enableShutdownHooks();
    await app.listen(port, host);
  } catch (error) {
    await app.close();
    throw error;
  }
}

void bootstrap().catch((error: unknown) => {
  logger.error(error instanceof EnvironmentError ? error.message : "FloodAid API failed to start.");
  process.exitCode = 1;
});
