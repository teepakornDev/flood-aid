import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { StaffOriginGuard, StaffRoleGuard, StaffSessionGuard } from "./staff-auth.guards";
import { StaffLoginLimiter } from "./staff-login-limiter";

@Module({
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, StaffLoginLimiter, StaffOriginGuard, StaffSessionGuard, StaffRoleGuard],
  exports: [AuthService, StaffOriginGuard, StaffSessionGuard, StaffRoleGuard],
})
export class AuthModule {}
