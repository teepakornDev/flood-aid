import "reflect-metadata";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Global, type INestApplication, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { configureApp } from "../src/common/configure-app";
import { HealthModule } from "../src/modules/health/health.module";

const webOrigin = "http://localhost:3000";
const database = {
  async query(sql: string) {
    assert.equal(sql, "SELECT PostGIS_Version()");
    if (!database.available) throw new Error("Internal driver error");
  },
  available: true,
};

@Global()
@Module({
  providers: [{ provide: DataSource, useValue: database }],
  exports: [DataSource],
})
class DatabaseTestModule {}

@Module({
  imports: [HealthModule, DatabaseTestModule],
})
class HealthTestModule {}

let app: INestApplication;
let baseUrl: string;

before(async () => {
  app = await NestFactory.create(HealthTestModule, { abortOnError: false, logger: false });
  configureApp(app, webOrigin);
  await app.listen(0, "127.0.0.1");
  baseUrl = await app.getUrl();
});

after(async () => {
  await app?.close();
});

test("health responds under the API prefix with a request ID and no caching", async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`, {
    headers: { Origin: webOrigin },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("x-request-id") ?? "", /^[\da-f-]{36}$/);
  assert.equal(response.headers.get("access-control-allow-origin"), webOrigin);
});

test("health returns a sanitized 503 if PostGIS cannot be queried", async () => {
  database.available = false;
  try {
    const response = await fetch(`${baseUrl}/api/v1/health`);

    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), {
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Service temporarily unavailable",
        requestId: response.headers.get("x-request-id"),
      },
    });
  } finally {
    database.available = true;
  }
});

test("Swagger and OpenAPI describe both health responses", async () => {
  const swagger = await fetch(`${baseUrl}/api/v1/docs`);
  assert.equal(swagger.status, 200);
  assert.match(await swagger.text(), /Swagger UI/);

  const schemaResponse = await fetch(`${baseUrl}/api/v1/openapi.json`);
  assert.equal(schemaResponse.status, 200);
  const schema = await schemaResponse.json();
  const responses = schema.paths["/api/v1/health"].get.responses;
  assert.ok(responses["200"]);
  assert.ok(responses["503"]);
});
