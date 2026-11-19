# Documentation index

**Canonical docs are organized by feature and concern.** The old all-in-one specification is preserved in [`reference/ORIGINAL_BLUEPRINT.md`](reference/ORIGINAL_BLUEPRINT.md) for context; if it conflicts with the modular docs, **the modular docs take precedence**. Raise ambiguities rather than silently making up product requirements.

## Map of documents

| Location | Purpose | Read when |
|---|---|---|
| [`../AGENTS.md`](../AGENTS.md) | AI assistant instructions | Every coding session |
| [`architecture/OVERVIEW.md`](architecture/OVERVIEW.md) | Vision, stack, services, security boundaries | Changing architecture |
| [`architecture/DATA_MODEL.md`](architecture/DATA_MODEL.md) | Entities, relations, GIS, migration guidance | DB changes |
| [`architecture/API_CONVENTIONS.md`](architecture/API_CONVENTIONS.md) | REST contracts, auth, errors, idempotency | API changes |
| [`architecture/SECURITY_AND_OPERATIONS.md`](architecture/SECURITY_AND_OPERATIONS.md) | Threat model, privacy, operational readiness | Any SOS or deployment change |
| [`modules/README.md`](modules/README.md) | Feature catalog and dependencies | Planning features |
| [`modules/auth/README.md`](modules/auth/README.md) | Staff login and roles | Auth implementation |
| [`modules/flood-reports/README.md`](modules/flood-reports/README.md) | Community flood reporting and public map | Public reporting |
| [`modules/sos/README.md`](modules/sos/README.md) | Anonymous SOS + private tracking | SOS implementation |
| [`modules/rescue-teams/README.md`](modules/rescue-teams/README.md) | Team members and dispatch | Assignment implementation |
| [`modules/coordinator-dashboard/README.md`](modules/coordinator-dashboard/README.md) | Triage queue and console | Admin UI |
| [`modules/audit/README.md`](modules/audit/README.md) | Traceability and operational history | Changes to staff actions |
| [`modules/media/README.md`](modules/media/README.md) | Photo upload and private evidence storage | Media feature |
| [`development/LOCAL_SETUP.md`](development/LOCAL_SETUP.md) | Monorepo, env and Docker setup | Bootstrap/local run |
| [`development/FRONTEND.md`](development/FRONTEND.md) | Routes, UI components and behavior | Frontend implementation |
| [`development/ROADMAP.md`](development/ROADMAP.md) | Priorities, stages, delivery checklists | Sprint planning |
| [`development/TESTING.md`](development/TESTING.md) | Test strategy and scenarios | Before merge/release |
| [`decisions/README.md`](decisions/README.md) | Architecture decision log | New technical decisions |

## Feature spec standard

Every `modules/<feature>/README.md` includes: purpose, scope and non-goals, actors/permissions, user stories, data model, API contract, UI behavior, validation/business rules, security/edge cases, dependencies and testable acceptance criteria. **Update the module spec in the same PR as the code.**

## Development order

Foundation → Auth (staff) → Flood Reports + Map → SOS (private) → Coordinator Dashboard → Rescue Teams → Audit/Media hardening → controlled pilot. See [`development/ROADMAP.md`](development/ROADMAP.md).
