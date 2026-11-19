# Module: Flood Reports

**Status:** Planned · **Priority:** P0 — first vertical slice · **Dependencies:** PostGIS, API foundation, Map UI; Media optional

## Purpose
Residents submit location-based observations; others view a time-stamped public map. Reports are **crowdsourced observations, not official warnings or safe-route clearance**.

## In scope

- Create report anonymously with point, observed time, `severity`, `roadStatus`, optional description and optional evidence image.
- Public browse by geographic bbox; filter recent observations and show verification badge.
- Staff verification: `UNVERIFIED`, `VERIFIED`, `REJECTED`; moderator action recorded.
- Limit abuse and duplicates; require source/observation freshness on map.

## User stories

- As resident, I can choose my GPS location or manually drop a pin to submit a report.
- As visitor, I can browse recent nearby flood reports with age and verification state.
- As coordinator, I can review and verify or reject questionable reports.

## Data model

`flood_reports`: `id, reporter_id nullable, location geography(Point,4326), severity, road_status, verification_status, description, observed_at, created_at`. GiST index on location; index for observed date/status. `report_evidence`: optional private upload metadata. Never include reporter ID in public DTO.

Enums: `LOW, MODERATE, HIGH, CRITICAL`; road `UNKNOWN, PASSABLE, IMPASSABLE`; verification `UNVERIFIED, VERIFIED, REJECTED`.

## API contract

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/v1/flood-reports` | Public, abuse-protected | Validate coords and timestamps |
| GET | `/api/v1/flood-reports?bbox=...` | Public | Limit area, freshness and results |
| GET | `/api/v1/flood-reports/:id` | Public | Sanitized detail only |
| PATCH | `/api/v1/admin/flood-reports/:id/verification` | Coordinator/Admin | Audit actor/reason |

Example POST:

```json
{
  "location": {"latitude": 7.01, "longitude": 100.47, "accuracyMeters": 20},
  "severity": "MODERATE",
  "roadStatus": "UNKNOWN",
  "observedAt": "2026-11-18T08:00:00Z",
  "description": "Water covering part of the roadway"
}
```

Public GET returns **GeoJSON FeatureCollection** or a documented list of typed GeoJSON features (pick one, update OpenAPI and frontend together). Feature properties: `id`, severity, road status, verification status and `observedAt`; **no names, contacts or SOS information**.

## Frontend

- `/map`: MapLibre map and report panel; bbox-based fetch with sensible debounce; markers distinguish `VERIFIED`/`UNVERIFIED`; show stale info visibly.
- `/report/new`: phone-friendly form, GPS permission/request and manual pin fallback, review before send, loading/success/failure states.
- Avoid exposing submitted image EXIF/private metadata; do not claim report road condition is verified.

## Business rules

- Reject invalid latitude/longitude, excessive description length, observed future times beyond allowed clock skew and excessive bbox or result counts.
- Retain/report `observedAt` separately from `createdAt`. Old reports should be visually de-emphasized or removed according to stated age policy.
- Protect public endpoint from spam and moderate offensive/false content; staff verification actions must be audited.

## Acceptance criteria

- [ ] A valid report creates a record with spatial point and returns 201.
- [ ] A report outside bbox does not appear; invalid bbox gets 400.
- [ ] Public GeoJSON includes no private reporter metadata; rejected records are excluded by default.
- [ ] Map shows report age and verification; GPS denial permits manual pin.
- [ ] No report is labeled an official warning or guaranteed passable route.
- [ ] Input validation, service tests and bbox integration test pass.

## Implementation order

1. Migration + indexed geometry → 2. DTO/entity/service/controller → 3. bbox query + tests → 4. Next.js form → 5. MapLibre markers → 6. staff verification → 7. optional photo upload.
