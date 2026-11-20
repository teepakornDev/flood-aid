# API standards and endpoint catalog

Base path: `/api/v1`. JSON fields use `camelCase`. Use RFC 3339/ISO 8601 UTC dates, UUID resource IDs, numeric lat/lon, consistent error response; generate OpenAPI via NestJS Swagger.

## Authentication and privacy

- Anonymous: public map/list, flood report submission, SOS submission.
- Resident SOS tracking: secret bearer token grants access **only to that case's minimal status projection**. Do not put token in URL, referrer or log; send in `Authorization` header via secure client-side handling.
- Staff: authenticated, role/assignment-checked on server. `ADMIN`, `COORDINATOR`, `RESCUER`.
- Public serializers cannot reuse SOS admin DTOs. Private SOS data never appears in public endpoints.

## Endpoints

| Method | Path | Access | Intent |
|---|---|---|---|
| GET | `/health` | Public | API and PostGIS readiness |
| POST | `/flood-reports` | Public, abuse-protected | Submit reported flood event |
| GET | `/flood-reports?bbox=minLon,minLat,maxLon,maxLat` | Public | Bounded map data, default freshness filter |
| GET | `/flood-reports/:id` | Public | Sanitized detail |
| GET | `/sos/intake` | Public | Local simulation availability |
| POST | `/sos` | Local simulation, abuse-protected | Create private SOS; require secret `Idempotency-Key` |
| GET | `/sos/:id` | Matching tracking token | Minimal case tracking |
| POST | `/auth/login` | Public | Staff authentication; rate-limited |
| POST | `/auth/logout` | Staff | Invalidate session |
| GET | `/auth/me` | Staff | Read minimal profile and session expiry |
| GET | `/admin/sos` | Coordinator/Admin | Private queue, pagination/filter |
| PATCH | `/admin/sos/:id/triage` | Coordinator/Admin | Assign priority and record actor/reason |
| PATCH | `/admin/sos/:id/status` | Authorized staff | Valid state transition + audit |
| POST | `/admin/sos/:id/assignments` | Coordinator/Admin | Atomic team assignment |
| GET | `/admin/rescue-teams` | Staff | Team directory |
| PATCH | `/admin/rescue-teams/:id/status` | Authorized staff | Availability update |
| GET | `/admin/flood-reports` | Coordinator/Admin | Private review queue with status and cursor filters |
| GET | `/admin/flood-reports/:id/verification` | Coordinator/Admin | Read the recorded decision |
| PATCH | `/admin/flood-reports/:id/verification` | Coordinator/Admin | Verify/reject evidence |

> Endpoint catalog is a planned contract, not proof of implementation. Ensure DTO validation, OpenAPI schema, tests and docs agree.

## Foundation health contract

`GET /api/v1/health` returns HTTP `200` with `{"status":"ok"}` when the API can query PostGIS. Once the API is running, a failed PostGIS query returns HTTP `503` with error code `SERVICE_UNAVAILABLE`, a generic message, and a server-generated request ID. Both responses set `Cache-Control: no-store` and `X-Request-Id`. Swagger UI is served at `/api/v1/docs` and the schema at `/api/v1/openapi.json`.

## Flood report contract

Anonymous POST returns `201` with a receipt after the insert commits. An identical retry returns the original receipt. GET list requires `bbox=west,south,east,north` with a maximum span of 2° per axis. Optional `limit` ranges from 1 to 500 (default 200). The list returns a GeoJSON FeatureCollection with `generatedAt` and `limitReached`. GET detail returns one GeoJSON Feature or `404`. Both read endpoints exclude rejected reports and observations older than 24 hours, and project only approximate points and public observation metadata. [Field and rate-limit details](../modules/flood-reports/README.md)

## Staff session contract

POST `/auth/login` accepts `{ email, password }`, sets a staff session cookie, and returns `{ user: { id, name, role }, expiresAt }`. GET `/auth/me` returns the same shape for a valid session. POST `/auth/logout` revokes the session and clears the cookie. Staff mutations require the configured web origin. Invalid credentials or expired sessions return `401`, denied roles or origins return `403`, and exceeding the login rate limit returns `429`. [Staff auth details](../modules/auth/README.md)

## Staff flood report moderation

The moderation queue and decision endpoints require a Coordinator or Admin session. The mutation accepts a terminal verification status and a compatible reason code. The status change and audit insert commit together. Identical retries by the same actor replay the prior decision. A different decision on a reviewed report returns `409`. [Moderation contract and reason codes](../modules/flood-reports/README.md)

## Example: create SOS

```http
POST /api/v1/sos HTTP/1.1
Content-Type: application/json
Idempotency-Key: <32 random bytes encoded as unpadded base64url>
```

```json
{
  "location": {"latitude": 7.01, "longitude": 100.47, "accuracyMeters": 25},
  "assistanceType": "EVACUATION",
  "peopleCount": 4,
  "description": "Water is rising at the house"
}
```

```json
{
  "id": "a73e155c-944c-4a2a-903a-1f169bc0a0b5",
  "status": "SUBMITTED",
  "createdAt": "2026-11-18T08:00:00Z",
  "trackingToken": "<private-tracking-credential>"
}
```

Treat the tracking and idempotency credentials as secrets. SOS responses use `Cache-Control: no-store`. `SUBMITTED` confirms database persistence. Matching retries return the original receipt during a 24-hour recovery window. [SOS recovery contract](../modules/sos/README.md)

## Error envelope (design target)

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Location is required",
    "details": [{"field": "location", "reason": "missing"}],
    "requestId": "req_123"
  }
}
```

Suggested status codes: 200 read/update, 201 created, 400 validation, 401 unauthenticated, 403 unauthorized, 404 absent/inaccessible, 409 state/idempotency conflict, 413 file too large, 422 semantic validation, 429 throttled, 500 unexpected, 503 temporarily unavailable. Avoid leaking whether unauthorized users' private cases exist.

## Idempotency contract

- Scope key by operation and actor/client namespace; hash key and canonical request body.
- The first request reserves the key and records the case reference in the same transaction as SOS creation and initial history.
- Retry with matching payload returns same logical case (and handles token retrieval design deliberately); mismatched payload yields `409`.
- If database operation fails, no success is returned. On client timeout, show status as **unconfirmed** until reconciliation; do not invent successful dispatch.
- Document TTL, concurrency and security of the secret token on retries before implementing production behavior.

## Pagination and geo filters

Use `limit`, cursor or page (document per endpoint), with maximum bounds and result limit. For flood map, require validated bbox and stale-data policy. All list endpoints server-filtered by staff access and role.
