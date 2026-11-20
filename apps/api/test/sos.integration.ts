import "reflect-metadata";
import assert from "node:assert/strict";
import { createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import type { CreateSosRequest, SosReceipt } from "@floodaid/contracts";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/common/configure-app";
import { readApiConfig } from "../src/common/environment";
import { hashSosKey, hashSosTrackingToken } from "../src/modules/sos/sos-crypto";
import { SosRepository } from "../src/modules/sos/sos.repository";

const credential = () => randomBytes(32).toString("base64url");

function decrypt(dataKey: Buffer, id: string, field: string, encrypted: Buffer): string {
  assert.equal(encrypted[0], 1);
  const decipher = createDecipheriv("aes-256-gcm", dataKey, encrypted.subarray(1, 13));
  decipher.setAAD(Buffer.from(`floodaid:sos:v1:${id}:${field}`));
  decipher.setAuthTag(encrypted.subarray(13, 29));
  return Buffer.concat([decipher.update(encrypted.subarray(29)), decipher.final()]).toString("utf8");
}

test("simulation SOS commits once, recovers receipts, protects data, and rolls back on database failure", async (context) => {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  const database = app.get(DataSource);
  const ids = new Set<string>();
  const dataKey = randomBytes(32);
  const environment = {
    SOS_SIMULATION_ENABLED: "false",
    SOS_DATA_KEY: dataKey.toString("base64url"),
    SOS_SIMULATION_REQUEST_LIMIT: "20",
    API_HOST: "127.0.0.1",
    WEB_ORIGIN: "http://localhost:3000",
  };
  const previous = Object.entries(environment).map(([name, value]) => {
    const prior = process.env[name];
    process.env[name] = value;
    return [name, prior] as const;
  });
  try {
    const { webOrigin } = readApiConfig();
    configureApp(app, webOrigin);
    await app.listen(0, "127.0.0.1");
    const api = `${await app.getUrl()}/api/v1`;
    const base = api + "/sos";
    const marker = randomUUID();
    const report: CreateSosRequest = {
      location: { latitude: -38.123456, longitude: -47.123456, accuracyMeters: 10 },
      assistanceType: "EVACUATION", peopleCount: 3,
      description: `Synthetic exercise note ${marker}`,
      contact: `synthetic-${marker}@example.test`,
    };
    const key = credential();
    const submit = (body: unknown, idempotencyKey?: string, origin = webOrigin) => fetch(base, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
      body: JSON.stringify(body),
    });
    const status = (id: string, token?: string) => fetch(`${base}/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    assert.deepEqual(await (await fetch(base + "/intake")).json(), { enabled: false });
    const disabled = await submit(report, key);
    assert.equal(disabled.status, 503);
    assert.equal((await disabled.json()).code, "SOS_INTAKE_DISABLED");
    assert.equal(disabled.headers.get("cache-control"), "no-store");
    process.env.SOS_SIMULATION_ENABLED = "true";
    assert.deepEqual(await (await fetch(base + "/intake")).json(), { enabled: true });
    assert.equal((await submit(report, key, "https://outside.example.test")).status, 503);
    assert.equal((await submit(report)).status, 400);
    assert.equal((await submit({ ...report, location: { latitude: 91, longitude: -47 } }, key)).status, 400);
    assert.equal((await submit({ ...report, peopleCount: 1001 }, key)).status, 400);

    const responses = await Promise.all([submit(report, key), submit(report, key)]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 201]);
    assert.ok(responses.every((response) => response.headers.get("cache-control") === "no-store" && !response.headers.has("location")));
    const [receipt, replay] = await Promise.all(responses.map((response) => response.json())) as SosReceipt[];
    ids.add(receipt.id);
    ids.add(replay.id);
    assert.deepEqual(receipt, replay);
    assert.equal(receipt.status, "SUBMITTED");
    assert.equal(receipt.trackingToken.length, 43);
    assert.equal((await submit({ ...report, peopleCount: 4 }, key)).status, 409);
    const [stored] = await database.query(
      `SELECT tracking_token_hash, description_encrypted, contact_encrypted, priority,
              ST_X(location::geometry) AS lon, ST_Y(location::geometry) AS lat
       FROM sos_requests WHERE id = $1`, [receipt.id],
    );
    assert.equal(stored.tracking_token_hash, hashSosTrackingToken(receipt.trackingToken));
    assert.equal(stored.priority, "UNASSESSED");
    assert.equal(stored.lon, report.location.longitude);
    assert.equal(stored.lat, report.location.latitude);
    assert.equal(decrypt(dataKey, receipt.id, "description", stored.description_encrypted), report.description);
    assert.equal(decrypt(dataKey, receipt.id, "contact", stored.contact_encrypted), report.contact);
    const [reserved] = await database.query("SELECT key_hash FROM idempotency_records WHERE response_ref = $1", [receipt.id]);
    assert.deepEqual(reserved.key_hash, hashSosKey(Buffer.from(key, "base64url")));
    const history = await database.query(
      "SELECT changed_by, old_status, new_status, reason FROM sos_status_history WHERE sos_id = $1",
      [receipt.id],
    );
    assert.deepEqual(history, [{ changed_by: null, old_status: null, new_status: "SUBMITTED", reason: "INTAKE_RECEIVED" }]);

    const privateStatus = await status(receipt.id, receipt.trackingToken);
    assert.equal(privateStatus.status, 200);
    assert.equal(privateStatus.headers.get("cache-control"), "no-store");
    assert.deepEqual(await privateStatus.json(), {
      id: receipt.id, status: "SUBMITTED", createdAt: receipt.createdAt, updatedAt: receipt.createdAt,
    });
    const noToken = await status(receipt.id);
    const badToken = await status(receipt.id, credential());
    const unknownCase = await status(randomUUID(), receipt.trackingToken);
    assert.deepEqual([noToken.status, badToken.status, unknownCase.status], [404, 404, 404]);
    assert.deepEqual(await noToken.json(), await badToken.json());
    assert.equal((await fetch(base)).status, 404);
    assert.equal((await fetch(`${api}/flood-reports/${receipt.id}`)).status, 404);
    const map = await (await fetch(api + "/flood-reports?bbox=-47.2,-38.2,-47,-38")).text();
    assert.ok(!map.includes(receipt.id) && !map.includes(marker));

    const failedKey = credential();
    const repository = app.get(SosRepository);
    const create = repository.create.bind(repository);
    const failed = context.mock.method(repository, "create", async (...args: Parameters<typeof create>) => {
      await create(...args);
      ids.add(args[1].id);
      throw new Error("Synthetic database transaction failure after initial history");
    });
    try {
      const result = await submit(report, failedKey);
      assert.equal(result.status, 503);
      assert.ok(!(await result.text()).includes(marker));
    } finally {
      failed.mock.restore();
    }
    const [rolledBack] = await database.query(
      `SELECT (SELECT count(*)::integer FROM sos_requests WHERE id = ANY($1::uuid[])) AS cases,
              (SELECT count(*)::integer FROM sos_status_history WHERE sos_id = ANY($1::uuid[])) AS history,
              (SELECT count(*)::integer FROM idempotency_records WHERE key_hash = $2) AS reservation`,
      [[...ids].filter((id) => id !== receipt.id), hashSosKey(Buffer.from(failedKey, "base64url"))],
    );
    assert.deepEqual(rolledBack, { cases: 0, history: 0, reservation: 0 });
    const retried = await submit(report, failedKey);
    assert.equal(retried.status, 201);
    ids.add((await retried.json()).id);

    await database.query("UPDATE idempotency_records SET expires_at = now() - interval '1 second' WHERE response_ref = $1", [receipt.id]);
    const expired = await submit(report, key);
    assert.equal(expired.status, 410);
    assert.equal((await expired.json()).code, "SOS_RECEIPT_EXPIRED");
    assert.equal((await status(receipt.id, receipt.trackingToken)).status, 200);
    process.env.SOS_SIMULATION_REQUEST_LIMIT = "1";
    assert.equal((await submit(report, credential())).status, 429);

    const schema = await (await fetch(api + "/openapi.json")).json();
    assert.ok(schema.paths["/api/v1/sos"].post.responses["201"]);
    assert.deepEqual(schema.paths["/api/v1/sos/{id}"].get.security, [{ sosTracking: [] }]);
  } finally {
    for (const [name, prior] of previous) {
      if (prior === undefined) delete process.env[name];
      else process.env[name] = prior;
    }
    try {
      await database.query("DELETE FROM sos_status_history WHERE sos_id = ANY($1::uuid[])", [[...ids]]);
      await database.query("DELETE FROM sos_requests WHERE id = ANY($1::uuid[])", [[...ids]]);
    } finally {
      await app.close();
    }
  }
});
