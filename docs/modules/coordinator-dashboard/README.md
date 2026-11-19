# Module: Coordinator Dashboard

**Status:** Planned · **Priority:** P1 · **Dependencies:** Auth, SOS, Rescue Teams, Audit

## Purpose

Give coordinators a secure queue to review, triage and progress residents' SOS requests with clear responsibility, timestamps and escalation paths.

## Scope and user stories

- As coordinator, I can see new/awaiting cases ordered by time and priority (including `UNASSESSED`).
- I can filter by status, assistance type, creation time and geographic area, without exposing this queue publicly.
- I can open a case, add an assessment reason, change priority and assign a team.
- I can distinguish **received, triaged, assigned, in transit, resolved** and view immutable history.
- I can identify cases not acknowledged in time, according to operational policy agreed with partner.

## Pages

- `/admin/login`: staff entry.
- `/admin`: summary cards (open, unassessed, assigned, unresolved) and safety/health notice.
- `/admin/sos`: paginated queue and filters.
- `/admin/sos/[id]`: protected case detail, history, triage and assignment.

## API dependencies

`GET /api/v1/admin/sos`, `PATCH /api/v1/admin/sos/:id/triage`, `PATCH /api/v1/admin/sos/:id/status`, `POST /api/v1/admin/sos/:id/assignments`; all must enforce server-side authorization and return only necessary PII.

## UX states

Loading, empty list, authorization expired, failed request, retry, stale data/polling paused, concurrent update conflict. Poll every 15–30 seconds as an initial UI behavior; this is **not** a substitute for operational alerting/monitoring. Show last refreshed time.

## Acceptance criteria

- [ ] Anonymous user receives 401/403, no private case data.
- [ ] Rescuer cannot open unassigned case via guessed URL.
- [ ] Priority can change from `UNASSESSED` only with authorized actor and reason.
- [ ] Invalid or concurrent status actions show conflict and refresh current state.
- [ ] Queue shows oldest untriaged cases and current refresh timestamp.
- [ ] Private data is excluded from client logs, analytics and screenshots in tests.
