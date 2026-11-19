# Module: Auth & RBAC

**Status:** Planned · **Priority:** P0 for staff routes · **Dependencies:** DB + NestJS foundation

## Purpose and scope
Provide accounts for rescuers, coordinators and admins. Anonymous residents can read public flood information and submit SOS/flood reports **without a login**. No resident signup, social login or multi-tenant account administration in MVP.

## Actors and permissions

- `ADMIN`: manage staff and teams, audit access, coordinator operations.
- `COORDINATOR`: private SOS queue, triage, assignment and verification.
- `RESCUER`: only assigned cases/team operations, not unrestricted personal data.
- Anonymous: public reporting and private case tracking only via scoped tracking token.

## User stories

- As staff, I can log in securely and log out.
- As coordinator, I can access the case queue; as an anonymous user I cannot.
- As rescuer, I see only cases my team is permitted to handle.

## Data model

`users(id uuid, name, email unique, password_hash, role, created_at, updated_at)` plus optional `sessions` table or properly managed session provider. Use server-generated IDs, high-strength password hashing (Argon2id or a defensible alternative), rate-limited login, short session lifetime and revocation strategy. Avoid public registration for privileged roles.

## API

| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | Validate, rate limit, set secure session |
| POST | `/api/v1/auth/logout` | Staff | Revoke session |
| GET | `/api/v1/auth/me` | Staff | Minimal user and role info |

Admin user provisioning initially via controlled seed/CLI, not a public endpoint. Use server guard/decorators for RBAC, and resource-level team membership checks for rescuer actions.

## Frontend

`/admin/login`, protected `/admin/*` layout. Show expired-session, invalid-password and network-error states. Never rely only on Next.js middleware for authorization; NestJS protects each route.

## Acceptance criteria

- [ ] Unauthorized `GET /admin/sos` returns 401/403 with no data.
- [ ] Role restrictions enforced server-side; rescuer cannot read unassigned private cases.
- [ ] Logout invalidates session; repeated login attempts are limited and logged without passwords.
- [ ] No session token/password appears in URLs, telemetry or client-visible errors.
- [ ] Staff session expiry is reflected clearly in UI.

## Non-goals

Public resident accounts, third-party SSO, passwordless auth, organization hierarchy.
