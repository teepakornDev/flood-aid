import { randomBytes } from "node:crypto";
import type { StaffSession } from "@floodaid/contracts";
import {
  HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException, UnauthorizedException,
} from "@nestjs/common";
import { AuthRepository } from "./auth.repository";
import type { StaffLoginDto } from "./auth.dto";
import { StaffLoginLimiter } from "./staff-login-limiter";
import { verifyStaffPassword } from "./staff-password";
import { hashSessionToken, readSessionHash, staffSessionLifetimeMs } from "./staff-session";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private activeLogins = 0;

  constructor(private readonly accounts: AuthRepository, private readonly limiter: StaffLoginLimiter) {}

  async login(body: StaffLoginDto, address: string, requestId: string): Promise<{ session: StaffSession; token: string }> {
    if (this.activeLogins >= 3) throw new ServiceUnavailableException("Staff authentication is temporarily busy.");
    if (!this.limiter.claim(address, body.email)) {
      throw new HttpException("Too many sign-in attempts. Try again later.", HttpStatus.TOO_MANY_REQUESTS);
    }

    this.activeLogins++;
    try {
      const account = await this.accounts.credentials(body.email);
      const valid = await verifyStaffPassword(body.password, account?.passwordHash);
      if (!account || !valid) {
        this.logger.warn({ message: "Staff sign-in rejected", requestId });
        throw new UnauthorizedException("Invalid email or password.");
      }

      const token = randomBytes(32).toString("base64url");
      const expiresAt = await this.accounts.issue(account.id, account.passwordHash, hashSessionToken(token), staffSessionLifetimeMs);
      if (!expiresAt) {
        this.logger.warn({ message: "Staff sign-in rejected", requestId });
        throw new UnauthorizedException("Invalid email or password.");
      }
      this.limiter.clearAccount(body.email);
      return { token, session: { user: { id: account.id, name: account.name, role: account.role }, expiresAt } };
    } finally {
      this.activeLogins--;
    }
  }

  logout(tokenHash: Buffer): Promise<void> {
    return this.accounts.revoke(tokenHash);
  }

  async authenticate(cookie: string | undefined): Promise<{ session: StaffSession; tokenHash: Buffer }> {
    const tokenHash = readSessionHash(cookie);
    const session = tokenHash && await this.accounts.session(tokenHash);
    if (!session || !tokenHash) throw new UnauthorizedException("Staff session required.");
    return { session, tokenHash };
  }
}
