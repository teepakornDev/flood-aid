import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const prefix = "scrypt-v1";
const work = { N: 65536, r: 8, p: 2, maxmem: 96 * 1024 * 1024 };

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 32, work, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export function normalizeStaffEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function hashStaffPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `${prefix}:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyStaffPassword(password: string, stored: string | undefined): Promise<boolean> {
  const match = stored?.match(/^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{64})$/);
  // Run the same derivation for an unknown account or unusable hash.
  const salt = match ? Buffer.from(match[1], "hex") : Buffer.alloc(16);
  const expected = match ? Buffer.from(match[2], "hex") : Buffer.alloc(32);
  const key = await deriveKey(password, salt);
  return timingSafeEqual(key, expected) && Boolean(match);
}
