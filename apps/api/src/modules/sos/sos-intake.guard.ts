import { type CanActivate, type ExecutionContext, HttpException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { Request, Response } from "express";
import { allowedWebOrigins, isLocalWebOrigin, readApiConfig } from "../../common/environment";
import { parseSosSecret } from "./sos-crypto";

export function sosIntakeKey(request: Request): Buffer | undefined {
  if (process.env.SOS_SIMULATION_ENABLED !== "true") return undefined;
  const { host, webOrigin } = readApiConfig();
  const loopback = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];
  if (!["localhost", ...loopback].includes(host) ||
      !loopback.includes(request.socket.remoteAddress ?? "") ||
      !["localhost", "127.0.0.1", "[::1]"].includes(request.hostname) ||
      request.get("Forwarded") || request.get("X-Forwarded-For") ||
      !isLocalWebOrigin(new URL(webOrigin))) return undefined;
  const origin = request.get("Origin");
  if (origin && !allowedWebOrigins(webOrigin).includes(origin)) return undefined;
  return parseSosSecret(process.env.SOS_DATA_KEY);
}

@Injectable()
export class SosIntakeGuard implements CanActivate {
  private expiresAt = 0;
  private count = 0;

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    if (!sosIntakeKey(http.getRequest<Request>())) {
      throw new ServiceUnavailableException({
        code: "SOS_INTAKE_DISABLED", message: "Local SOS simulation is unavailable.",
      });
    }

    const now = Date.now();
    if (now >= this.expiresAt) {
      this.expiresAt = now + 10 * 60_000;
      this.count = 0;
    }
    const configured = Number(process.env.SOS_SIMULATION_REQUEST_LIMIT);
    const limit = Number.isInteger(configured) && configured >= 1 && configured <= 100 ? configured : 12;
    if (this.count >= limit) {
      http.getResponse<Response>().setHeader("Retry-After", Math.ceil((this.expiresAt - now) / 1000));
      throw new HttpException("Too many simulation requests. Try again later.", 429);
    }
    this.count++;
    return true;
  }
}
