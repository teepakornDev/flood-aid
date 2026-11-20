# Module: Audit & History

**Status:** In progress · **Priority:** P0 cross-cutting prior to staff pilot · **Dependencies:** DB, staff auth

Flood report moderation uses durable audit records. SOS transitions and rescue assignments will use the audit module as those workflows are implemented.

## Purpose

Maintain who changed SOS priority/status, verified reports and assigned rescue teams, and when. Protect this data from public exposure and prevent accidental disclosure of private notes or credentials.

## Scope

- Append-only SOS lifecycle history: `sos_status_history` is created in the same transaction as each transition.
- Structured `audit_logs` for staff actions and sensitive access where justified.
- Include actor, action, resource type/id, timestamp, result and safe/redacted metadata; trace request ID.
- Do not log raw request bodies, secrets, bearer tokens, passwords, tracking tokens or sensitive SOS contact/health details.

## Schema

`audit_logs(id uuid, actor_id uuid nullable, action varchar, entity_type varchar, entity_id uuid, result varchar, metadata_redacted jsonb, occurred_at timestamptz, request_id uuid nullable)`. Index `(entity_type, entity_id, occurred_at, id)` and `(actor_id, occurred_at)`. Actor IDs remain in the record if the corresponding account is removed.

## Internal integration

Use application service method/transaction to write business change plus audit log atomically. External structured logging may be eventually consistent, but durable lifecycle history must not be optional. Do not rely on a best-effort event emitter for compliance-critical history.

Flood report decisions append a `FLOOD_REPORT_VERIFICATION` event with result `SUCCEEDED`, the server request ID, old and new statuses and a structured reason code. The application exposes reads and inserts for these records. The staff review view resolves the actor display name from the staff account.

## Access

Audit records only for authorized admin/coordinators as appropriate; do not create public browse endpoint. Retention and deletion policy must be agreed before a real pilot.

## Acceptance criteria

- [ ] Every SOS status and priority change has actor/time/reason history.
- [ ] Every assignment/reassignment has a durable audit entry.
- [x] Every flood report verification has a durable audit entry.
- [x] Simulated flood moderation transaction failure rolls back both state change and audit entry.
- [x] Flood report audit metadata contains only verification statuses and a structured reason.
