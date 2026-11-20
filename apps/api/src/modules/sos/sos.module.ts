import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { SosController } from "./sos.controller";
import { SosIntakeGuard } from "./sos-intake.guard";
import { SosRepository } from "./sos.repository";
import { SosService } from "./sos.service";

@Module({ controllers: [SosController], providers: [SosRepository, SosService, SosIntakeGuard] })
export class SosModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply((_request: Request, response: Response, next: NextFunction) => {
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Referrer-Policy", "no-referrer");
      next();
    }).forRoutes(SosController);
  }
}
