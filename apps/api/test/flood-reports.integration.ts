import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { CreateFloodReport, FloodReportCollection, FloodReportReceipt } from "@floodaid/contracts";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module";
import { configureApp } from "../src/common/configure-app";

test("anonymous HTTP reports persist once and expose only recent public points", async () => {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  const ids = new Set<string>();
  const database = app.get(DataSource);
  try {
    configureApp(app, "http://localhost:3000");
    await app.listen(0, "127.0.0.1");
    const base = `${await app.getUrl()}/api/v1/flood-reports`;
    const report: CreateFloodReport = {
      location: { longitude: -47.123456, latitude: -38.123456, accuracyMeters: 25 },
      severity: "MODERATE",
      roadStatus: "IMPASSABLE",
      observedAt: new Date().toISOString(),
      description: `Synthetic integration report ${randomUUID()}`,
    };
    const create = async (body: CreateFloodReport): Promise<FloodReportReceipt> => {
      const response = await fetch(base, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      });
      assert.equal(response.status, 201);
      assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:3000");
      const receipt = await response.json() as FloodReportReceipt;
      ids.add(receipt.id);
      return receipt;
    };

    const [first, replay] = await Promise.all([create(report), create(report)]);
    assert.deepEqual(first, replay);
    const [stored] = await database.query(
      'SELECT ST_X(location::geometry) AS lon, ST_Y(location::geometry) AS lat, accuracy_m, reporter_id FROM flood_reports WHERE id = $1',
      [first.id],
    );
    assert.deepEqual(stored, { lon: report.location.longitude, lat: report.location.latitude, accuracy_m: 25, reporter_id: null });
    const outside = await create({ ...report, location: { longitude: -49, latitude: -38.12 } });
    const old = await create({ ...report, observedAt: new Date(Date.now() - 25 * 3600_000).toISOString() });
    const rejected = await create({ ...report, severity: "HIGH" });
    await database.query("UPDATE flood_reports SET verification_status = 'REJECTED' WHERE id = $1", [rejected.id]);

    const bbox = "?bbox=-47.13,-38.13,-47.12,-38.12";
    const response = await fetch(base + bbox);
    assert.equal(response.status, 200);
    const list = await response.json() as FloodReportCollection;
    assert.equal(list.type, "FeatureCollection");
    assert.ok(!list.features.some((feature) => [outside.id, old.id, rejected.id].includes(feature.id)));
    const actual = list.features.find((feature) => feature.id === first.id);
    assert.deepEqual(actual, {
      type: "Feature", id: first.id,
      geometry: { type: "Point", coordinates: [-47.123, -38.123] },
      properties: {
        id: first.id, severity: "MODERATE", roadStatus: "IMPASSABLE", verificationStatus: "UNVERIFIED",
        observedAt: report.observedAt, createdAt: first.createdAt, source: "COMMUNITY",
      },
    });
    assert.deepEqual(await (await fetch(base + "/" + first.id)).json(), actual);
    assert.equal((await fetch(base + "/" + rejected.id)).status, 404);
    assert.equal((await fetch(base + "/" + old.id)).status, 404);
    await create({ ...report, severity: "LOW" });
    const limited = await (await fetch(base + bbox + "&limit=1")).json() as FloodReportCollection;
    assert.equal(limited.features.length, 1);
    assert.equal(limited.limitReached, true);
  } finally {
    try {
      if (ids.size) await database.query("DELETE FROM flood_reports WHERE id = ANY($1::uuid[])", [[...ids]]);
    } finally {
      await app.close();
    }
  }
});
