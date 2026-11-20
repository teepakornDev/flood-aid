import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { StaffLoginLimiter } from "../src/modules/auth/staff-login-limiter";
import { hashStaffPassword, verifyStaffPassword } from "../src/modules/auth/staff-password";
import { hashSessionToken, readSessionHash, staffCookieName } from "../src/modules/auth/staff-session";

test("password hashes use random salts and reject invalid credentials", async () => {
  const password = randomBytes(24).toString("base64url");
  const first = await hashStaffPassword(password);
  const second = await hashStaffPassword(password);
  assert.match(first, /^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{64}$/);
  assert.notEqual(first, second);
  assert.equal(await verifyStaffPassword(password, first), true);
  assert.equal(await verifyStaffPassword(password + "!", first), false);
  assert.equal(await verifyStaffPassword(password, undefined), false);
});

test("session parsing requires one valid cookie and returns only its digest", () => {
  const token = randomBytes(32).toString("base64url");
  const cookie = `${staffCookieName}=${token}`;
  assert.deepEqual(readSessionHash(`other=1; ${cookie}`), hashSessionToken(token));
  assert.equal(readSessionHash(`${cookie}; ${cookie}`), undefined);
  assert.equal(readSessionHash(`${staffCookieName}=invalid`), undefined);
  assert.equal(readSessionHash(undefined), undefined);
});

test("sign-in limits apply across account and address attempts", () => {
  const limiter = new StaffLoginLimiter();
  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal(limiter.claim(`address-${attempt}`, "staff@example.test"), true);
  }
  assert.equal(limiter.claim("new-address", "staff@example.test"), false);
  limiter.clearAccount("staff@example.test");
  assert.equal(limiter.claim("new-address", "staff@example.test"), true);
  for (let attempt = 0; attempt < 20; attempt++) {
    assert.equal(limiter.claim("fixed-address", `staff-${attempt}@example.test`), true);
  }
  assert.equal(limiter.claim("fixed-address", "another@example.test"), false);
});
