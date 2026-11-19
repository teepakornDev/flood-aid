# Instructions for coding agents — FloodAid

This file is intended for AI assistants operating inside the repository.

## Read order

1. `docs/README.md` — index and source-of-truth rules.
2. `docs/architecture/OVERVIEW.md` — architecture, stack and boundaries.
3. `docs/architecture/DATA_MODEL.md` and `docs/architecture/API_CONVENTIONS.md` — cross-module contracts.
4. `docs/modules/<module>/README.md` — requirements and acceptance criteria for the feature you are implementing.
5. `docs/development/ROADMAP.md` and `docs/development/LOCAL_SETUP.md`.

## Coding rules

- Work in small, testable vertical slices. Before edits, identify the module, dependencies and acceptance criteria.
- Stack: TypeScript strict, pnpm monorepo, Next.js App Router, NestJS REST `/api/v1`, PostgreSQL 17/PostGIS 3.5, TypeORM **explicit migrations**. Disable schema synchronization outside throwaway tests.
- Prefer a modular monolith; do not introduce microservices, Kafka, Kubernetes, AI, real-time services, or new dependencies without a documented decision.
- Database columns: `snake_case`; JSON fields: `camelCase`; timestamps ISO 8601 UTC; coordinates `[longitude, latitude]` in GeoJSON/PostGIS.
- All authentication and authorization must be checked by the server; never rely on hidden frontend controls.
- Validate every DTO, geographic bounding box, uploaded file and query limit. Use parameterized SQL for PostGIS queries.
- Separate **public flood data** from **private SOS data**. Never expose SOS location, contact information, health/vulnerability notes, tracking tokens or audit logs on public APIs or maps.
- Anonymous SOS: random high-entropy token, **hash at rest**, do not put token in URLs/logs; `Idempotency-Key` must prevent duplicate submissions on retry.
- SOS status changes and rescue assignments require allowed transitions, staff permissions, atomic transactions, audit history and concurrency protection.
- `SUBMITTED` means persisted by the server, **not** dispatched, received by a responder or guaranteed help. On ambiguous network failure show **unconfirmed**, never success.
- Keep private uploads private, use short-lived signed retrieval URLs only after authorization, validate file type/size and strip metadata if appropriate.
- No real-world pilot without a staffed partner, escalation process, verified backup contact channel, disaster recovery and rehearsal.
- Don't add secrets, real personal data, `.env`, tokens or private logs to Git.

## Implementation sequence per module

1. Read the module spec and related architecture docs.
2. Record assumptions or gaps; avoid inventing new business rules.
3. Add/update database migration and indexes.
4. Add DTO, entity/repository, service and controller.
5. Add auth guards, validation, auditing and error handling.
6. Add unit/integration tests and OpenAPI documentation.
7. Implement mobile UI and failure/empty/loading states.
8. Run lint, typecheck and tests; report what actually ran.
9. Update the relevant module README and shared architecture/API docs for any contract change.

## Definition of done

- Feature acceptance criteria satisfied and tested; authorization/PII reviewed.
- Retry, duplicate and concurrency behavior tested where relevant.
- Docs reflect actual implementation; migrations reversible when practical.
- Mobile usability and accessibility checked; no misleading safety promises.

## Suggested first coding prompt

"Read AGENTS.md, docs/README.md, docs/architecture/OVERVIEW.md and docs/development/LOCAL_SETUP.md. Implement Sprint 0 foundation only. Provide modified files, commands to run and tests actually executed. Do not create SOS workflows yet."
