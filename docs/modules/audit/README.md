# Module: Audit & History

**Status:** Planned · **Priority:** P0 cross-cutting prior to staff pilot · **Dependencies:** DB, staff auth

## Purpose

Maintain who changed SOS priority/status, verified reports and assigned rescue teams, and when. Protect this data from public exposure and prevent accidental disclosure of private notes or credentials.

## Scope

- Append-only SOS lifecycle history: `sos_status_history` is created in the same transaction as each transition.
- Structured `audit_logs` for staff actions and sensitive access where justified.
- Include actor, action, resource type/id, timestamp, result and safe/redacted metadata; trace request ID.
- Do not log raw request bodies, secrets, bearer tokens, passwords, tracking tokens or sensitive SOS contact/health details.

## Proposed schema

`audit_logs(id uuid, actor_id uuid nullable, action varchar, entity_type varchar, entity_id uuid, metadata_redacted jsonb, occurred_at timestamptz, request_id varchar nullable)`. Index `(entity_type, entity_id, occurred_at)` and `(actor_id, occurred_at)`.

## Internal integration

Use application service method/transaction to write business change plus audit log atomically. External structured logging may be eventually consistent, but durable lifecycle history must not be optional. Do not rely on a best-effort event emitter for compliance-critical history.

## Access

Audit records only for authorized admin/coordinators as appropriate; do not create public browse endpoint. Retention and deletion policy must be agreed before a real pilot.

## Acceptance criteria

- [ ] Every SOS status and priority change has actor/time/reason history.
- [ ] Every assignment/reassignment and report verification has a durable audit entry.
- [ ] Simulated transaction failure rolls back both state change and audit entry.
- [ ] Logs contain no tracking token, PII payload, password or object storage secret.
