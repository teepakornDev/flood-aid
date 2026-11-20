import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { FloodModerationPage, FloodReportCollection, FloodReviewRequest } from "@floodaid/contracts";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/common/configure-app";
import { readApiConfig } from "../src/common/environment";
import { AuditService } from "../src/modules/audit/audit.service";
import { AuthRepository } from "../src/modules/auth/auth.repository";
import { hashStaffPassword } from "../src/modules/auth/staff-password";

const verify: FloodReviewRequest = { verificationStatus: "VERIFIED", reason: "FIELD_CONFIRMED" };
const reject: FloodReviewRequest = { verificationStatus: "REJECTED", reason: "INSUFFICIENT_EVIDENCE" };

test("moderation enforces staff permissions, audits once, and commits decisions atomically", async (context) => {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  const database = app.get(DataSource);
  const marker = randomUUID();
  const emails = ["admin", "coordinator", "rescuer"].map((role) => `${role}-${marker}@example.test`);
  const reports: string[] = [];
  const { webOrigin } = readApiConfig();
  const password = randomUUID();

  try {
    configureApp(app, webOrigin);
    await app.listen(0, "127.0.0.1");
    const base = `${await app.getUrl()}/api/v1`;
    const queue = base + "/admin/flood-reports";
    const publicBase = base + "/flood-reports";
    const accountRepo = app.get(AuthRepository);
    const passwordHash = await hashStaffPassword(password);
    const staff = [];
    for (const [index, role] of (["ADMIN", "COORDINATOR", "RESCUER"] as const).entries()) {
      await accountRepo.createAccount(emails[index], `Test ${role}`, role, passwordHash);
      const login = await fetch(base + "/auth/login", {
        method: "POST", headers: { Origin: webOrigin, "Content-Type": "application/json" },
        body: JSON.stringify({ email: emails[index], password }),
      });
      assert.equal(login.status, 200);
      staff.push({ id: (await login.json()).user.id as string, cookie: login.headers.get("set-cookie")!.split(";")[0] });
    }
    const [admin, coordinator, rescuer] = staff;
    const staffGet = (url: string, cookie: string) => fetch(url, { headers: { Cookie: cookie } });
    const patch = (id: string, cookie: string, body: unknown, origin = webOrigin) => fetch(`${queue}/${id}/verification`, {
      method: "PATCH", headers: { Cookie: cookie, Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    async function create(description: string) {
      const response = await fetch(publicBase, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: { longitude: -47.123456, latitude: -38.123456 },
          roadStatus: "UNKNOWN", severity: "HIGH", observedAt: new Date().toISOString(), description,
        }),
      });
      assert.equal(response.status, 201);
      const { id } = await response.json() as { id: string };
      reports.push(id);
      return id;
    }

    const privateDescription = `Synthetic private description ${marker}`;
    const visible = await create(privateDescription);
    const hidden = await create(`Synthetic rejected report ${marker}`);
    const racing = await create(`Synthetic concurrency report ${marker}`);
    const rollback = await create(`Synthetic rollback report ${marker}`);

    assert.equal((await fetch(queue)).status, 401);
    assert.equal((await staffGet(queue, rescuer.cookie)).status, 403);
    assert.equal((await staffGet(`${queue}/${visible}/verification`, rescuer.cookie)).status, 403);
    assert.equal((await patch(visible, rescuer.cookie, verify)).status, 403);
    assert.equal((await patch(visible, coordinator.cookie, verify, "https://foreign.example.test")).status, 403);
    assert.equal((await patch(visible, coordinator.cookie, { ...verify, reason: "free text" })).status, 400);
    assert.equal((await patch(visible, coordinator.cookie, { ...verify, reason: reject.reason })).status, 400);
    assert.equal((await patch(randomUUID(), coordinator.cookie, verify)).status, 404);
    assert.equal((await staffGet(queue + "?limit=51", admin.cookie)).status, 400);

    const queueResponse = await staffGet(queue, coordinator.cookie);
    assert.equal(queueResponse.status, 200);
    assert.equal(queueResponse.headers.get("cache-control"), "no-store");
    const pending = await queueResponse.json() as FloodModerationPage;
    const item = pending.reports.find((report) => report.id === visible);
    assert.equal(item?.description, privateDescription);
    assert.equal(item?.longitude, -47.123);
    assert.ok(item && !("reporterId" in item));
    const firstPage = await (await staffGet(queue + "?limit=1", coordinator.cookie)).json() as FloodModerationPage;
    assert.ok(firstPage.nextCursor);
    const secondPage = await (await staffGet(queue + "?limit=1&cursor=" + firstPage.nextCursor, coordinator.cookie)).json() as FloodModerationPage;
    assert.equal(secondPage.reports.length, 1);
    assert.notEqual(secondPage.reports[0].id, firstPage.reports[0].id);

    const saved = await patch(visible, coordinator.cookie, verify);
    assert.equal(saved.status, 200);
    const receipt = await saved.json();
    assert.equal(receipt.decision.actorId, coordinator.id);
    assert.equal(receipt.decision.reason, verify.reason);
    const [event] = await database.query(
      "SELECT action, entity_type, result, request_id, metadata_redacted FROM audit_logs WHERE entity_id = $1",
      [visible],
    );
    assert.deepEqual(event, {
      action: "FLOOD_REPORT_VERIFICATION", entity_type: "FLOOD_REPORT", result: "SUCCEEDED",
      request_id: saved.headers.get("x-request-id"),
      metadata_redacted: { previousStatus: "UNVERIFIED", verificationStatus: "VERIFIED", reason: "FIELD_CONFIRMED" },
    });
    assert.deepEqual(await (await staffGet(`${queue}/${visible}/verification`, admin.cookie)).json(), receipt);
    assert.deepEqual(await (await patch(visible, coordinator.cookie, verify)).json(), receipt);
    assert.equal((await patch(visible, admin.cookie, verify)).status, 409);
    assert.equal((await patch(visible, coordinator.cookie, { ...verify, reason: "TRUSTED_SOURCE" })).status, 409);

    assert.equal((await patch(hidden, admin.cookie, reject)).status, 200);
    assert.equal((await fetch(`${publicBase}/${hidden}`)).status, 404);
    const publicReport = await (await fetch(`${publicBase}/${visible}`)).json();
    assert.equal(publicReport.properties.verificationStatus, "VERIFIED");
    assert.ok(!JSON.stringify(publicReport).includes(privateDescription));
    assert.ok(!("reason" in publicReport.properties) && !("actorId" in publicReport.properties));
    const map = await (await fetch(publicBase + "?bbox=-47.2,-38.2,-47,-38")).json() as FloodReportCollection;
    assert.ok(map.features.some((feature) => feature.id === visible && feature.properties.verificationStatus === "VERIFIED"));
    assert.ok(!map.features.some((feature) => feature.id === hidden));

    const competing = await Promise.all([patch(racing, admin.cookie, verify), patch(racing, coordinator.cookie, reject)]);
    assert.deepEqual(competing.map((response) => response.status).sort(), [200, 409]);
    const counts = await database.query(
      "SELECT entity_id, count(*)::integer AS count FROM audit_logs WHERE entity_id = ANY($1::uuid[]) GROUP BY entity_id",
      [[visible, racing]],
    );
    assert.equal(counts.length, 2);
    assert.ok(counts.every((row: { count: number }) => row.count === 1));

    const audit = app.get(AuditService);
    const append = audit.appendFloodVerification.bind(audit);
    const failed = context.mock.method(audit, "appendFloodVerification", async (...args: Parameters<typeof append>) => {
      await append(...args);
      throw new Error("Synthetic transaction failure after audit insert");
    });
    try {
      assert.equal((await patch(rollback, coordinator.cookie, verify)).status, 503);
    } finally {
      failed.mock.restore();
    }
    const [unchanged] = await database.query(
      "SELECT verification_status FROM flood_reports WHERE id = $1", [rollback],
    );
    assert.equal(unchanged.verification_status, "UNVERIFIED");
    const [missing] = await database.query("SELECT count(*)::integer AS count FROM audit_logs WHERE entity_id = $1", [rollback]);
    assert.equal(missing.count, 0);
  } finally {
    try {
      await database.query("DELETE FROM audit_logs WHERE entity_id = ANY($1::uuid[])", [reports]);
      await database.query("DELETE FROM flood_reports WHERE id = ANY($1::uuid[])", [reports]);
      await database.query("DELETE FROM users WHERE email = ANY($1::text[])", [emails]);
    } finally {
      await app.close();
    }
  }
});
