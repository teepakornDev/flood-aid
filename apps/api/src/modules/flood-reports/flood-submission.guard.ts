import { type CanActivate, type ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { Request, Response } from "express";

const windowMs = 10 * 60 * 1000;
const maxClients = 10_000;

@Injectable()
export class FloodSubmissionGuard implements CanActivate {
  private readonly clients = new Map<string, { count: number; expires: number }>();
  private pruneAt = 0;

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const address = request.ip ?? request.socket.remoteAddress ?? "unknown";
    const now = Date.now();

    if (now >= this.pruneAt) {
      for (const [ip, entry] of this.clients) {
        if (entry.expires <= now) this.clients.delete(ip);
      }
      this.pruneAt = now + 60_000;
    }

    const entry = this.clients.get(address);
    if (entry && entry.expires > now) {
      if (entry.count >= 12) this.reject(http.getResponse<Response>(), entry.expires - now);
      entry.count++;
    } else {
      if (!entry && this.clients.size >= maxClients) this.reject(http.getResponse<Response>(), this.pruneAt - now);
      this.clients.set(address, { count: 1, expires: now + windowMs });
    }
    return true;
  }

  private reject(response: Response, remainingMs: number): never {
    response.setHeader("Retry-After", Math.ceil(remainingMs / 1000));
    throw new HttpException("Too many flood report requests. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
  }
}
