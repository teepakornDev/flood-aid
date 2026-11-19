# Feature modules

Each feature has its own `README.md`. **The `modules/` directory is the source of truth for feature scope and acceptance criteria.** Do not rely on a single large prompt to implement the entire product.

| Module | Main responsibility | Required first? | Dependencies |
|---|---|---|---|
| [Auth](auth/README.md) | Staff login, RBAC, sessions | Yes for admin | DB, API foundation |
| [Flood Reports](flood-reports/README.md) | Anonymous field reports, public map, verification | **First vertical slice** | PostGIS, API, frontend |
| [SOS](sos/README.md) | Anonymous request, tracking, retry protection | After foundations | DB, audit/idempotency |
| [Coordinator Dashboard](coordinator-dashboard/README.md) | Private queue, triage, case changes | After SOS | Auth, SOS, audit |
| [Rescue Teams](rescue-teams/README.md) | Team directory and assignments | After dashboard | Auth, SOS, audit |
| [Audit](audit/README.md) | Mutation history, sensitive access logs | Cross-cutting | Auth and DB |
| [Media](media/README.md) | Private evidence uploads | Optional in initial vertical slice | Storage, security |

## Status tags

Each module starts with **Status: Planned**. AI should update status to `In progress`, `Implemented`, or `Pilot-validated` **only after verifying code and tests**.

## Template for future modules

Use `docs/modules/_TEMPLATE.md` to define new scoped features (e.g. shelters, relief logistics) in later phases. Do not add new modules until there is a validated product need.
