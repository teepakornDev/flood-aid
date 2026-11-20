import "reflect-metadata";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { Controller, Get, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/common/configure-app";
import { readApiConfig } from "../src/common/environment";
import { AuthModule } from "../src/modules/auth/auth.module";
import { AuthRepository } from "../src/modules/auth/auth.repository";
import { RequireStaffRoles } from "../src/modules/auth/staff-auth.guards";
import { hashStaffPassword } from "../src/modules/auth/staff-password";
import { readSessionHash, staffCookieName } from "../src/modules/auth/staff-session";

@Controller("role-probe")
class RoleProbeController {
  @Get("coordinate")
  @RequireStaffRoles("ADMIN", "COORDINATOR")
  coordinate() { return { allowed: true }; }
}

@Module({ imports: [AppModule, AuthModule], controllers: [RoleProbeController] })
class AuthTestModule {}

test("staff authentication and deny-by-default roles use revocable PostgreSQL sessions", async () => {
  const app = await NestFactory.create(AuthTestModule, { logger: false, abortOnError: false });
  const database = app.get(DataSource);
  const originalOrigin = process.env.WEB_ORIGIN;
  const { webOrigin } = readApiConfig();
  const marker = randomUUID();
  const coordinator = `coord-${marker}@example.test`;
  const rescuer = `rescuer-${marker}@example.test`;
  const password = randomUUID();
  try {
    const accounts = app.get(AuthRepository);
    const passwordHash = await hashStaffPassword(password);
    assert.equal(await accounts.createAccount(coordinator, "Test Coordinator", "COORDINATOR", passwordHash), true);
    assert.equal(await accounts.createAccount(coordinator, "Unchanged Account", "ADMIN", passwordHash), false);
    assert.equal(await accounts.createAccount(rescuer, "Test Rescuer", "RESCUER", passwordHash), true);
    configureApp(app, webOrigin);
    await app.listen(0, "127.0.0.1");
    const base = `${await app.getUrl()}/api/v1`;
    const post = (email: string, inputPassword: string, origin = webOrigin) => fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ email, password: inputPassword }),
    });
    const withCookie = (route: string, cookie: string) => fetch(base + route, { headers: { Cookie: cookie } });
    const signOut = (cookie: string, origin: string) => fetch(base + "/auth/logout", {
      method: "POST",
      headers: { Cookie: cookie, Origin: origin },
    });
    assert.equal((await fetch(base + "/auth/me")).status, 401);
    assert.equal((await fetch(base + "/role-probe/coordinate")).status, 401);
    assert.equal((await post(coordinator, password, "https://other.example.test")).status, 403);
    const wrong = await post(coordinator, "incorrect");
    const unknown = await post(`absent-${marker}@example.test`, "incorrect");
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.deepEqual(await wrong.json(), await unknown.json());

    const login = await post(coordinator.toUpperCase(), password);
    assert.equal(login.status, 200);
    assert.equal(login.headers.get("cache-control"), "no-store");
    const header = login.headers.get("set-cookie") ?? "";
    assert.match(header, /; HttpOnly/);
    assert.match(header, /; SameSite=Strict/);
    assert.match(header, /; Path=\//);
    assert.match(header, /; Max-Age=14400/);
    const cookie = header.split(";")[0];
    const hash = readSessionHash(cookie);
    assert.ok(hash);
    const session = await login.json();
    assert.deepEqual(Object.keys(session).sort(), ["expiresAt", "user"]);
    assert.deepEqual(Object.keys(session.user).sort(), ["id", "name", "role"]);
    assert.equal(session.user.role, "COORDINATOR");
    assert.ok(Date.parse(session.expiresAt) > Date.now());
    const [stored] = await database.query("SELECT token_hash FROM staff_sessions WHERE user_id = $1", [session.user.id]);
    assert.deepEqual(stored.token_hash, hash);
    assert.deepEqual(await (await withCookie("/auth/me", cookie)).json(), session);
    assert.equal((await withCookie("/role-probe/coordinate", cookie)).status, 200);

    const rescueLogin = await post(rescuer, password);
    assert.equal(rescueLogin.status, 200);
    const rescueCookie = rescueLogin.headers.get("set-cookie")?.split(";")[0] ?? "";
    assert.match(rescueCookie, new RegExp(`^${staffCookieName}=`));
    assert.equal((await withCookie("/role-probe/coordinate", rescueCookie)).status, 403);
    await database.query("UPDATE users SET role = 'RESCUER' WHERE email = $1", [coordinator]);
    assert.equal((await withCookie("/role-probe/coordinate", cookie)).status, 403);

    assert.equal((await signOut(cookie, "https://other.example.test")).status, 403);
    assert.equal((await withCookie("/auth/me", cookie)).status, 200);
    const logout = await signOut(cookie, webOrigin);
    assert.equal(logout.status, 204);
    assert.match(logout.headers.get("set-cookie") ?? "", /Expires=Thu, 01 Jan 1970/);
    assert.equal((await withCookie("/auth/me", cookie)).status, 401);
    await database.query("UPDATE staff_sessions SET expires_at = now() - interval '1 second' WHERE token_hash = $1",
      [readSessionHash(rescueCookie)]);
    assert.equal((await withCookie("/auth/me", rescueCookie)).status, 401);

    const schemaResponse = await fetch(base + "/openapi.json");
    assert.equal(schemaResponse.status, 200);
    const schema = await schemaResponse.json();
    assert.equal(schema.components.securitySchemes.staffSession.name, staffCookieName);
    assert.deepEqual(schema.paths["/api/v1/auth/me"].get.security, [{ staffSession: [] }]);
    assert.equal(schema.components.schemas.StaffLoginDto.properties.password.writeOnly, true);

    process.env.WEB_ORIGIN = "https://staff.example.test";
    const secureLogin = await post(coordinator, password, process.env.WEB_ORIGIN);
    assert.equal(secureLogin.status, 200);
    assert.match(secureLogin.headers.get("set-cookie") ?? "", /; Secure/);
    process.env.WEB_ORIGIN = webOrigin;

    const throttledAccount = `throttle-${marker}@example.test`;
    for (let count = 0; count < 5; count++) {
      assert.equal((await post(throttledAccount, "incorrect")).status, 401);
    }
    assert.equal((await post(throttledAccount, "incorrect")).status, 429);

    const existing = await Promise.all([post(coordinator, password), post(coordinator, password)]);
    const cookies = existing.map((response) => {
      assert.equal(response.status, 200);
      return response.headers.get("set-cookie")?.split(";")[0] ?? "";
    });
    const newPassword = randomUUID();
    const newHash = await hashStaffPassword(newPassword);
    const racingTokenHash = randomBytes(32);
    const [reset] = await Promise.all([
      accounts.resetPassword(coordinator, newHash),
      accounts.issue(session.user.id, passwordHash, racingTokenHash, 60_000),
    ]);
    assert.equal(reset, true);
    assert.equal(await accounts.session(racingTokenHash), undefined);
    assert.equal(await accounts.issue(session.user.id, passwordHash, randomBytes(32), 60_000), undefined);
    for (const previous of cookies) {
      assert.equal((await withCookie("/auth/me", previous)).status, 401);
    }
    assert.equal((await post(coordinator, password)).status, 401);
    const updated = await post(coordinator, newPassword);
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).user.id, session.user.id);
    assert.equal(await accounts.resetPassword(`missing-${marker}@example.test`, newHash), false);
  } finally {
    if (originalOrigin === undefined) delete process.env.WEB_ORIGIN;
    else process.env.WEB_ORIGIN = originalOrigin;
    try {
      await database.query("DELETE FROM users WHERE email = ANY($1::text[])", [[coordinator, rescuer]]);
    } finally {
      await app.close();
    }
  }
});
