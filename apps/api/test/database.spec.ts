import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import database from "../src/database/data-source";

test("the migrated database provides PostgreSQL 17, PostGIS 3.5 and pgcrypto", async () => {
  await database.initialize();
  try {
    assert.equal(await database.showMigrations(), false);
    const [result] = await database.query(
      `SELECT current_setting('server_version_num')::integer AS "serverVersion",
              PostGIS_Lib_Version() AS "postgisVersion",
              ST_AsText(ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS location,
              encode(digest('floodaid', 'sha256'), 'hex') AS digest`,
      [100.47, 7.01],
    );
    assert.equal(Math.floor(result.serverVersion / 10_000), 17);
    assert.match(result.postgisVersion, /^3\.5\./);
    assert.equal(result.location, "POINT(100.47 7.01)");
    assert.equal(result.digest, createHash("sha256").update("floodaid").digest("hex"));
  } finally {
    await database.destroy();
  }
});
