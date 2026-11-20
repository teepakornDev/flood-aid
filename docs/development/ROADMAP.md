# Implementation roadmap — solo developer

**Estimate:** roughly six 1-week increments for an initial controlled pilot candidate, not a public release commitment. Re-scope based on tests, access to a response partner and actual developer capacity.

## Sprint 0 — Foundation

- [x] Set up pnpm workspaces, Next.js, NestJS and shared contracts.
- [x] Configure Docker Compose PostgreSQL/PostGIS, env validation and TypeORM migrations.
- [x] Set up REST `/api/v1`, Swagger/OpenAPI, the health check and automated checks.
- [x] Document repository conventions and local setup.

**Exit:** web/API boot, DB PostGIS query succeeds, migration runner works, health endpoint responds and automated checks run.

## Sprint 1 — Flood report vertical slice

- [x] Indexed `flood_reports` migration, DTO validation, PostGIS bbox query.
- [x] Anonymous submission endpoint and sanitized public GeoJSON endpoints.
- [x] `/report/new` and `/map` mobile pages with data freshness and verification state.
- [x] HTTP and PostGIS integration tests, duplicate handling, and submission rate limit.

**Exit:** real report can be submitted, stored, located and displayed publicly without private metadata.

## Sprint 2 — SOS creation and private tracking

- [ ] SOS migration + history + idempotency table, encrypted sensitive fields where used.
- [ ] Anonymous POST SOS, strong tracking token, private GET status.
- [ ] Client manual location fallback, submission status and ambiguous network behavior.
- [ ] Retried/duplicate/conflicting submissions test suite.

**Exit:** one submitted case persists atomically; anonymous status tracking is private and reliable under retry.

## Sprint 3 — Staff auth and coordinator console

- [x] Staff auth, revocable sessions and role guards. Delivered ahead of SOS to support flood report verification.
- [x] Staff flood report queue, verification, and transactional audit history.
- [ ] Resource-level guards for private SOS cases and team assignments.
- [ ] Secure queue, triage updates, status history and private case view.
- [ ] Audit logs and aged-untriaged case views.
- [ ] Security/integration tests for denial and invalid transitions.

**Exit:** authorized coordinator can triage a case; anonymous and wrong-role access is denied.

## Sprint 4 — Rescue coordination

- [ ] Team roster/member roles/availability.
- [ ] Atomic assignment, acceptance/decline/reassignment, conflict handling.
- [ ] Coordinator and rescuer UI, end-to-end history.

**Exit:** case moves from submitted to appropriately staffed and tracked lifecycle in a simulated drill.

## Sprint 5 — Hardening and supervised pilot readiness

- [ ] Private evidence uploads if prioritized; optional for first pilot.
- [ ] Backup & restore rehearsal, monitoring, slow-network and offline cases.
- [ ] Load tests, accessibility review, PII/security checks.
- [ ] On-call partner, manual escalation, verified fallback contact, incident rehearsal.

**Exit:** partner-approved supervised trial only; do not claim emergency service readiness from technical tests alone.

## Issue template

```markdown
Title: [module] concise outcome
Docs: docs/modules/<name>/README.md
User story: As a ... I want ... so that ...
Dependencies: ...
Implementation:
- [ ] Migration/schema
- [ ] DTO/service/controller
- [ ] Authorization/audit
- [ ] Unit/integration tests
- [ ] Mobile UI and states
- [ ] OpenAPI and docs updated
Acceptance criteria:
- Given ... when ... then ...
Evidence: commands actually run, screenshots/test results
```
