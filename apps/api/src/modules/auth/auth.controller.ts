import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiResponse, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import type { CookieOptions, Request, Response } from "express";
import { readApiConfig } from "../../common/environment";
import { StaffLoginDto, StaffSessionDto } from "./auth.dto";
import { AuthService } from "./auth.service";
import { RequireStaffRoles, StaffOriginGuard } from "./staff-auth.guards";
import { type AuthenticatedStaffRequest, staffCookieName, staffRoles, staffSessionLifetimeMs } from "./staff-session";

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: new URL(readApiConfig().webOrigin).protocol === "https:",
    sameSite: "strict",
    path: "/",
  };
}

@ApiTags("Staff Auth")
@ApiUnauthorizedResponse({ description: "Invalid credentials or missing staff session" })
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  @UseGuards(StaffOriginGuard)
  @ApiOkResponse({ type: StaffSessionDto, description: "Creates a staff session cookie" })
  @ApiResponse({ status: 403, description: "Request origin rejected" })
  @ApiResponse({ status: 429, description: "Staff sign-in rate limit exceeded" })
  async login(
    @Body() body: StaffLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StaffSessionDto> {
    const address = request.ip ?? request.socket.remoteAddress ?? "unknown";
    const result = await this.auth.login(body, address, String(response.getHeader("X-Request-Id") ?? ""));
    response.cookie(staffCookieName, result.token, { ...cookieOptions(), maxAge: staffSessionLifetimeMs });
    return result.session;
  }

  @Get("me")
  @Header("Cache-Control", "no-store")
  @RequireStaffRoles(...staffRoles)
  @ApiOkResponse({ type: StaffSessionDto })
  me(@Req() request: AuthenticatedStaffRequest): StaffSessionDto {
    return request.staff;
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header("Cache-Control", "no-store")
  @RequireStaffRoles(...staffRoles)
  @ApiResponse({ status: 204, description: "Revokes the current staff session" })
  @ApiResponse({ status: 403, description: "Request origin rejected" })
  async logout(
    @Req() request: AuthenticatedStaffRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(request.staffTokenHash);
    response.clearCookie(staffCookieName, cookieOptions());
  }
}
