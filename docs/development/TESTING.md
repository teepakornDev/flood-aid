# Testing and release quality

Use unit tests for business transitions, integration tests with real PostgreSQL/PostGIS for geographic SQL, and E2E tests for public and coordinator flows. Prefer reproducible seeded test data over real user/incident data.

## Minimum test matrix

| Area | Test | Expected |
|---|---|---|
| Flood Reports | bbox excludes external points | Only inside bbox, max results enforced |
| Flood Reports | unauthenticated submission with invalid coords | 400; no record |
| Flood Reports | public serialization | No resident IDs/PII, no SOS data |
| SOS | valid anonymous request | One persisted SOS + history + tracking token |
| SOS | same idempotency key/payload replay | Same logical case; no duplicate |
| SOS | same idempotency key, different payload | 409 conflict |
| SOS | API timeout after DB commit | UI says unconfirmed; retry can reconcile |
| SOS | wrong or missing tracking token | No other case contents disclosed |
| SOS | invalid transition | 409 or domain error, no state mutation |
| Rescue | simultaneous assignment from two coordinators | At most one primary active assignment |
| Auth | rescuer reads unassigned private case | 403/404 without data leak |
| Evidence | oversized or forged MIME upload | rejected; no public URL |
| Operations | PostgreSQL outage during POST | no success response; graceful fallback messaging |

## Test layers

- **Unit:** DTO validation, policy authorization, SOS transition rules and idempotency branching.
- **Integration:** actual DB migrations, geospatial bbox `ST_Intersects`, transaction rollback, assignment concurrency, access control.
- **E2E:** mobile report submit → map; anonymous SOS submit → private track; coordinator triage → team accept → resolved.
- **Operational:** load spikes, DB restart, failed upload, stale external feeds (future phase), backup recovery and manual incident drill.

## Required checks before merging

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:integration
```

The foundation HTTP tests cover healthy and unavailable database responses and both Swagger endpoints. Run the database integration test after `pnpm db:migrate`. It checks for pending migrations, PostgreSQL and PostGIS versions, spatial SQL and pgcrypto.

Do not state that tests passed unless they were executed; log what ran and any failures. Gate actual SOS pilot additionally on real response staffing, contingency contact and privacy/security approval.
