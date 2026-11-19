export class EnvironmentError extends Error {}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new EnvironmentError(`${name} is required.`);
  }
  return value;
}

export function portEnv(name: string, fallback?: string): number {
  const value = process.env[name] ?? fallback;
  if (!value || !/^\d{1,5}$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new EnvironmentError(`${name} must be a port between 1 and 65535.`);
  }
  return Number(value);
}

export function readApiConfig() {
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const url = URL.parse(webOrigin);
  if (!url || !["http:", "https:"].includes(url.protocol) || url.origin !== webOrigin) {
    throw new EnvironmentError("WEB_ORIGIN must be an HTTP(S) origin without a trailing slash.");
  }

  return {
    host: process.env.API_HOST ?? "127.0.0.1",
    port: portEnv("API_PORT", "4000"),
    webOrigin,
  };
}
