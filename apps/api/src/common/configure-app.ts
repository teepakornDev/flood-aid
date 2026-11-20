import { randomUUID } from "node:crypto";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
import { staffCookieName } from "../modules/auth/staff-session";
import { allowedWebOrigins } from "./environment";

export function configureApp(app: INestApplication, webOrigin: string): void {
  app.setGlobalPrefix("api/v1");
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("X-Request-Id", randomUUID());
    next();
  });
  app.enableCors({ origin: allowedWebOrigins(webOrigin), exposedHeaders: ["X-Request-Id"] });
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );

  const metadata = new DocumentBuilder()
    .setTitle("FloodAid API")
    .setVersion("1.0")
    .addCookieAuth(staffCookieName, { type: "apiKey" }, "staffSession")
    .build();
  SwaggerModule.setup("docs", app, () => SwaggerModule.createDocument(app, metadata), {
    useGlobalPrefix: true,
    jsonDocumentUrl: "openapi.json",
    raw: ["json"],
  });
}
