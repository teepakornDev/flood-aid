# Module: Auth & RBAC

**Status:** In progress · **Priority:** P0 for staff routes · **Dependencies:** DB + NestJS foundation

Staff sign-in, revocation, and role guards are implemented. Case-level permissions are verified with their SOS and team routes when those modules are available.

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

`users(id uuid, name, email unique, password_hash, role, created_at, updated_at)` stores the staff account and its current role. Emails are normalized to lowercase. Passwords are salted and hashed with Node's built-in scrypt (`N=65536, r=8, p=2`) so password storage requires no native package. [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt)

`staff_sessions(token_hash, user_id, expires_at, created_at)` stores SHA-256 digests of 32 random bytes encoded as URL-safe tokens. A session lasts four hours from issue. Logout deletes the current session. Deleting a staff account revokes its sessions through the foreign key. The API reads the current role on each protected request.

## API

| Method | Route | Access | Notes |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Public from configured web origin | Returns `200` with session expiry and minimal staff profile. Sets an HttpOnly session cookie |
| POST | `/api/v1/auth/logout` | Staff | Revokes the session, clears the cookie, returns `204` |
| GET | `/api/v1/auth/me` | Staff | Returns `{ user: { id, name, role }, expiresAt }` or `401` |

Run `pnpm --filter @floodaid/api staff:create` from a trusted terminal after applying migrations. The command prompts for email, display name, role and a 15–128-character password. Password entry is hidden. An existing email remains with its current account and role.

An operator with database access can run `pnpm --filter @floodaid/api staff:reset-password` for an existing email. The command prompts for the new password and confirmation. Updating the password and revoking every session for that account commit in one transaction.

The browser sends the `floodaid_staff` cookie on the web origin. It is host-only, `HttpOnly`, `SameSite=Strict`, and `Secure` when `WEB_ORIGIN` uses HTTPS. HTTP sign-in is limited to loopback origins. Staff mutations require an allowed `Origin`. Invalid credentials return a generic `401`. The API limits sign-in to five tries per account and twenty per connection IP per 15-minute window. Success clears the account counter. Invalid credentials are logged with the request ID.

For a staff API in another NestJS module, import `AuthModule` and apply `@RequireStaffRoles(...roles)` with the permitted roles. Apply resource-level team checks where a route handles rescue assignments. The local limiter runs per API instance and uses the direct connection IP. In local development the Next.js proxy shares that IP. Configure trusted proxy identity and shared rate limiting when deploying multiple instances.

## Frontend

`/admin/login` handles sign-in. `/admin` renders the signed-in staff profile and logout. Protected layouts and pages recheck the session through the server-side helper. The UI shows expired-session, invalid-credentials and network-error states. Next.js proxies only the three staff auth endpoints at the web origin, and NestJS enforces authorization.

## Acceptance criteria

- [ ] Unauthorized `GET /admin/sos` returns 401/403 with no data.
- [ ] Rescuer access to SOS case data is restricted to assigned cases.
- [x] Role restrictions are enforced server-side in a protected endpoint test.
- [x] Logout invalidates the session. Repeated login attempts are limited and failed credentials are logged by request ID.
- [x] Authentication response bodies and URLs omit session tokens and passwords. The token is issued through an HttpOnly cookie.
- [x] Staff session expiry is reflected in the UI.

## Non-goals

Public resident accounts, third-party SSO, passwordless auth, organization hierarchy.
