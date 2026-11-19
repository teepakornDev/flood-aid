# Module: Rescue Teams & Assignments

**Status:** Planned · **Priority:** P1 · **Dependencies:** Auth, SOS, Audit, coordinator workflow

## Purpose

Maintain an approved roster of rescue teams and support **manual, accountable** assignment to SOS cases. Do **not** automatically send the nearest team; distance does not prove route safety or equipment compatibility.

## Scope

- Staff create/update teams (name, availability, capabilities/equipment notes, base location, contact channel subject to privacy policy).
- Assign/coordinator-initiated reassignment of eligible teams to cases.
- Rescuer can view cases authorized for their team, accept/decline an assignment and update progress within defined permissions.
- Track assignment status `ASSIGNED | ACCEPTED | DECLINED | COMPLETED | CANCELLED`.

## Entities

`rescue_teams(id, name, status, base_location geography nullable, ...)`, `team_members(team_id, user_id)`, `rescue_assignments(id, sos_id, team_id, status, assigned_at, completed_at)`. Add capabilities as structured codes or documented notes; do not pretend free text is machine-validated equipment readiness.

## API

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/api/v1/admin/rescue-teams` | Staff | Filter by availability and capability |
| POST | `/api/v1/admin/rescue-teams` | Admin | Create team |
| PATCH | `/api/v1/admin/rescue-teams/:id/status` | Authorized staff | Update availability |
| POST | `/api/v1/admin/sos/:id/assignments` | Coordinator/Admin | Atomic assignment |
| PATCH | `/api/v1/admin/assignments/:id/status` | Authorized team/coordinator | Accept/decline/complete |

## Concurrency invariant

Exactly one **primary active assignment** per SOS in MVP unless multi-team support is explicitly designed. Use transaction + row lock on SOS, validation of current status/team readiness and a DB constraint (e.g. partial unique index on `sos_id` for active primary assignments). Unique `(sos_id,team_id)` is insufficient. Coordinator must be able to reassign after decline or cancellation, with audit history.

## UI

`/admin/rescue-teams` for team list/status; assignment modal on `/admin/sos/[id]`; rescuer view filtered by membership. Show missing capabilities, unknown routes and manual override reason.

## Acceptance criteria

- [ ] Anonymous/public cannot list assignments or team-sensitive data.
- [ ] Coordinators can assign an available eligible team with audit record.
- [ ] Two simultaneous primary assignments cannot both succeed.
- [ ] Rescuer access limited to own team assignments.
- [ ] Declined assignment may be reassigned, with history retained.
- [ ] No UI labels straight-line location as guaranteed safe route.
