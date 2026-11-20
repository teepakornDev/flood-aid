import { Injectable } from "@nestjs/common";

const windowMs = 15 * 60 * 1000;
const maxKeys = 10_000;

@Injectable()
export class StaffLoginLimiter {
  private readonly attempts = new Map<string, { count: number; expiresAt: number }>();
  private pruneAt = 0;

  claim(address: string, email: string): boolean {
    const now = Date.now();
    if (now >= this.pruneAt) {
      for (const [key, entry] of this.attempts) {
        if (entry.expiresAt <= now) this.attempts.delete(key);
      }
      this.pruneAt = now + 60_000;
    }

    const keys = [{ key: `ip:${address}`, max: 20 }, { key: `email:${email}`, max: 5 }];
    const missing = keys.filter(({ key }) => !this.attempts.has(key)).length;
    if (this.attempts.size + missing > maxKeys) return false;
    const counters = keys.map(({ key, max }) => {
      const entry = this.attempts.get(key);
      return { key, max, entry: entry && entry.expiresAt > now ? entry : { count: 0, expiresAt: now + windowMs } };
    });
    if (counters.some(({ entry, max }) => entry.count >= max)) return false;
    for (const { key, entry } of counters) {
      this.attempts.set(key, { count: entry.count + 1, expiresAt: entry.expiresAt });
    }
    return true;
  }

  clearAccount(email: string): void {
    this.attempts.delete(`email:${email}`);
  }
}
