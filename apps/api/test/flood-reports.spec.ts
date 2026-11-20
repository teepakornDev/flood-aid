import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import type { CreateFloodReport } from "@floodaid/contracts";
import { Module, type INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { configureApp } from "../src/common/configure-app";
import { FloodReportsController } from "../src/modules/flood-reports/flood-reports.controller";
import { FloodReportsRepository } from "../src/modules/flood-reports/flood-reports.repository";
import { FloodReportsService } from "../src/modules/flood-reports/flood-reports.service";
import { FloodSubmissionGuard } from "../src/modules/flood-reports/flood-submission.guard";

const id = randomUUID();
const report: CreateFloodReport = {
  location: { latitude: 7.01, longitude: 100.47 },
  severity: "MODERATE",
  roadStatus: "UNKNOWN",
  observedAt: new Date().toISOString(),
};
const fingerprints: string[] = [];
const repository = {
  save(_report: CreateFloodReport, fingerprint: Buffer) {
    fingerprints.push(fingerprint.toString("hex"));
    return { id, createdAt: new Date() };
  },
  list: () => [],
  find: () => undefined,
};

@Module({
  controllers: [FloodReportsController],
  providers: [FloodReportsService, FloodSubmissionGuard, { provide: FloodReportsRepository, useValue: repository }],
})
class FloodReportsTestModule {}

let app: INestApplication;
let base: string;

before(async () => {
  app = await NestFactory.create(FloodReportsTestModule, { logger: false, abortOnError: false });
  configureApp(app, "http://localhost:3000");
  await app.listen(0, "127.0.0.1");
  base = `${await app.getUrl()}/api/v1/flood-reports`;
});

after(async () => { await app?.close(); });

function post(body: unknown, headers = {}) {
  return fetch(base, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });
}

test("valid submission returns a receipt and normalizes equivalent submissions", async () => {
  const first = await post({ ...report, description: " Water on road " });
  const second = await post({ ...report, description: "Water on road", observedAt: report.observedAt.replace("Z", "+00:00") });
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal((await first.json()).id, id);
  assert.equal(fingerprints[0], fingerprints[1]);
});

test("invalid report fields are rejected before persistence", async () => {
  for (const body of [
    { ...report, location: { latitude: 91, longitude: 100.47 } },
    { ...report, location: { latitude: "7", longitude: 100.47 } },
    { ...report, observedAt: new Date(Date.now() + 3600_000).toISOString() },
    { ...report, observedAt: "2026-02-30T08:00:00Z" },
    { ...report, severity: "UNKNOWN" },
    { ...report, description: "x".repeat(501) },
    { ...report, reporterId: id },
  ]) {
    assert.equal((await post(body)).status, 400);
  }
  assert.equal(fingerprints.length, 2);
});

test("bbox bounds, ordering, area and maximum limit are enforced", async () => {
  for (const query of [
    "", "?bbox=1,2,3", "?bbox=2,2,1,3", "?bbox=-181,2,-180,3", "?bbox=1,2,4,3",
    "?bbox=1,2,2,3&limit=501", "?bbox=1,2,2,3&limit=0", "?bbox=1,2,2,3&limit=2.5",
  ]) {
    assert.equal((await fetch(base + query)).status, 400);
  }
  const valid = await fetch(base + "?bbox=1,2,2,3&limit=500");
  assert.equal(valid.status, 200);
  assert.deepEqual((await valid.json()).features, []);
  assert.equal((await fetch(base + "/invalid-id")).status, 400);
  assert.equal((await fetch(base + "/" + id)).status, 404);
});

test("browser requests work on either local development hostname", async () => {
  const response = await fetch(base, {
    method: "OPTIONS",
    headers: { Origin: "http://127.0.0.1:3000", "Access-Control-Request-Method": "POST" },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:3000");
  const foreign = await fetch(base + "?bbox=1,2,2,3", { headers: { Origin: "https://example.test" } });
  assert.equal(foreign.headers.get("access-control-allow-origin"), null);
});

test("OpenAPI publishes the submission, bbox list and detail schemas", async () => {
  const response = await fetch(base.replace(/\/flood-reports$/, "/openapi.json"));
  assert.equal(response.status, 200);
  const document = await response.json();
  const reports = document.paths["/api/v1/flood-reports"];
  assert.ok(reports.post.responses["201"].content["application/json"].schema.$ref.endsWith("/FloodReportReceiptDto"));
  assert.ok(reports.get.parameters.some(({ name }: { name: string }) => name === "bbox"));
  assert.ok(reports.get.responses["200"].content["application/json"].schema.$ref.endsWith("/FloodReportCollectionDto"));
  assert.ok(document.paths["/api/v1/flood-reports/{id}"].get.responses["404"]);
});

test("the submission guard returns 429 and Retry-After after 12 attempts", async () => {
  for (let attempt = 0; attempt < 3; attempt++) {
    assert.equal((await post(report)).status, 201);
  }
  const throttled = await post(report, { "X-Forwarded-For": "192.0.2.1" });
  assert.equal(throttled.status, 429);
  assert.ok(Number(throttled.headers.get("retry-after")) > 0);
});
