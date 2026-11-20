import { createHash } from "node:crypto";
import type { StaffRole, StaffSession } from "@floodaid/contracts";
import type { Request } from "express";

export const staffRoles = ["ADMIN", "COORDINATOR", "RESCUER"] as const satisfies readonly StaffRole[];
export const staffCookieName = "floodaid_staff";
export const staffSessionLifetimeMs = 4 * 60 * 60 * 1000;

export interface AuthenticatedStaffRequest extends Request {
  staff: StaffSession;
  staffTokenHash: Buffer;
}

export function readSessionHash(cookie: string | undefined): Buffer | undefined {
  const matches = cookie?.split(";").map((part) => part.trim()).filter((part) => part.startsWith(`${staffCookieName}=`));
  if (matches?.length !== 1) return undefined;
  const token = matches[0].slice(staffCookieName.length + 1);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return undefined;
  return hashSessionToken(token);
}

export function hashSessionToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}
