import { createCipheriv, createHash, createHmac, randomBytes } from "node:crypto";

export function parseSosSecret(value: string | undefined): Buffer | undefined {
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) return undefined;
  const bytes = Buffer.from(value, "base64url");
  return bytes.length === 32 && bytes.toString("base64url") === value ? bytes : undefined;
}

export function hashSosKey(key: Buffer): Buffer {
  return createHash("sha256").update("floodaid:sos:key:v1:").update(key).digest();
}

export function fingerprintSosRequest(key: Buffer, canonical: string): Buffer {
  return createHmac("sha256", key).update("floodaid:sos:request:v1:").update(canonical).digest();
}

export function createSosTrackingToken(key: Buffer, caseId: string): string {
  return createHmac("sha256", key).update("floodaid:sos:tracking:v1:").update(caseId).digest("base64url");
}

export function hashSosTrackingToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function encryptSosText(
  key: Buffer, caseId: string, field: "description" | "contact", text: string | undefined,
): Buffer | null {
  if (!text) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`floodaid:sos:v1:${caseId}:${field}`));
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]);
}
