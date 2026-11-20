import type { StaffRole } from "@floodaid/contracts";
import {
  applyDecorators, type CanActivate, type ExecutionContext, ForbiddenException, Injectable,
  SetMetadata, UseGuards,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ApiCookieAuth } from "@nestjs/swagger";
import type { Request } from "express";
import { allowedWebOrigins, isLocalWebOrigin, readApiConfig } from "../../common/environment";
import { AuthService } from "./auth.service";
import type { AuthenticatedStaffRequest } from "./staff-session";

const staffRoleMetadata = Symbol("staffRoles");

@Injectable()
export class StaffOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;

    const { webOrigin } = readApiConfig();
    const url = new URL(webOrigin);
    if (url.protocol !== "https:" && !isLocalWebOrigin(url)) {
      throw new ForbiddenException("Staff authentication requires HTTPS.");
    }
    const origin = request.get("Origin");
    if (!origin || !allowedWebOrigins(webOrigin).includes(origin)) {
      throw new ForbiddenException("Staff request origin is not allowed.");
    }
    return true;
  }
}

@Injectable()
export class StaffSessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedStaffRequest>();
    const { session, tokenHash } = await this.auth.authenticate(request.headers.cookie);
    request.staff = session;
    request.staffTokenHash = tokenHash;
    return true;
  }
}

@Injectable()
export class StaffRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<StaffRole[]>(staffRoleMetadata, [
      context.getHandler(), context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<Partial<AuthenticatedStaffRequest>>();
    if (!request.staff || !roles?.includes(request.staff.user.role)) {
      throw new ForbiddenException("Staff role is not allowed.");
    }
    return true;
  }
}

export function RequireStaffRoles(...roles: [StaffRole, ...StaffRole[]]) {
  return applyDecorators(
    SetMetadata(staffRoleMetadata, roles),
    UseGuards(StaffOriginGuard, StaffSessionGuard, StaffRoleGuard),
    ApiCookieAuth("staffSession"),
  );
}
