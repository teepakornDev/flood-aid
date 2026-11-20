# Module: Flood Reports

**Status:** In progress · **Priority:** P0 · **Dependencies:** PostGIS and API foundation. Staff verification requires Auth and Audit. Optional photos require Media.

The public reporting and map slice is implemented and verified.

## Purpose
Residents submit location-based observations; others view a time-stamped public map. Reports are **crowdsourced observations, not official warnings or safe-route clearance**.

## Public reporting

- Create a report anonymously with a point, optional GPS accuracy, observed time, `severity`, `roadStatus`, and an optional private description.
- Public browse by geographic bbox; filter recent observations and show verification badge.
- Return a receipt only after persistence. Collapse identical submissions and rate-limit requests.

Staff verification and its audit history are planned with Auth and Audit. Evidence uploads are planned with Media.

## User stories

- As resident, I can choose my GPS location or manually drop a pin to submit a report.
- As visitor, I can browse recent nearby flood reports with age and verification state.
- As coordinator, I can review and verify or reject questionable reports.

## Data model

`flood_reports` stores the exact submitted `location` as `geography(Point,4326)`, optional `accuracy_m`, a reserved nullable `reporter_id`, statuses, a private description, and separate observation and creation timestamps. A generated `public_location` rounds the point to a 0.001° grid and has a partial GiST index for public results. A partial date index supports recent results. A unique SHA-256 fingerprint makes identical submissions atomic under concurrent retry. A future Auth migration can add a foreign key for `reporter_id`.

Enums: `LOW, MODERATE, HIGH, CRITICAL`; road `UNKNOWN, PASSABLE, IMPASSABLE`; verification `UNVERIFIED, VERIFIED, REJECTED`.

## API contract

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/api/v1/flood-reports` | Public | Returns `201` with `id` and `createdAt`. Identical submissions return the original receipt |
| GET | `/api/v1/flood-reports?bbox=west,south,east,north` | Public | Returns a GeoJSON FeatureCollection. Optional `limit` defaults to 200 and is capped at 500 |
| GET | `/api/v1/flood-reports/:id` | Public | Returns one public GeoJSON Feature. Missing, rejected and expired reports return `404` |
| PATCH | `/api/v1/admin/flood-reports/:id/verification` | Coordinator/Admin | Planned with actor/reason audit |

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

GeoJSON coordinates use `[longitude, latitude]` from the public grid. Properties include `id`, `severity`, `roadStatus`, `verificationStatus`, `observedAt`, `createdAt`, and `source: "COMMUNITY"`. The collection also includes `generatedAt` and `limitReached`, which indicates additional results. Results are ordered by latest observation. The public endpoints exclude descriptions, exact coordinates, GPS accuracy, reporter IDs, and SOS data.

## Frontend

- `/map` uses MapLibre GL JS (as selected in the architecture), debounces viewport queries by 300 ms and refreshes once a minute while visible. Markers and the accompanying list distinguish verified and unverified reports. The list shows observation time, age and a stale label after six hours. Coordinate search and the list work when WebGL or tiles fail.
- `/report/new` supports GPS, map pin selection, and keyboard-accessible coordinate fields. It shows a review and waits for a server receipt. A timeout keeps the same draft for retry and shows that confirmation is unavailable.
- The default map centers near Hat Yai and uses a bundled Natural Earth basemap with approximate Southeast Asia country boundaries plus major roads and lakes in and around Thailand. It uses 1:50m Admin 0 Countries, 1:10m Roads, and 1:10m Lakes from the Natural Earth v5.1.2 data release. Set `NEXT_PUBLIC_MAP_STYLE_URL` for approved street-level tiles. [Natural Earth source](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson) · [Terms of use](https://www.naturalearthdata.com/about/terms-of-use/)

## Business rules

- Validate longitude/latitude, optional GPS accuracy from 0 to 100,000 meters, timezone-qualified observation time, and description length up to 500 characters. Allow five minutes of future clock skew.
- Public queries include the past 24 hours, excluding rejected rows. The bbox must be ordered, in coordinate range, and at most 2° per side. Bbox and detail use the same rounded point.
- Identical point, observation time, severity, road status and trimmed description return the same receipt. Optional GPS accuracy does not affect retry matching.
- The API allows 12 submission attempts per connection IP per ten minutes in one instance and returns `429` with `Retry-After` when exceeded. Proxy deployments need a trusted forwarded-IP and shared rate-limiting configuration before public intake.
- The frontend labels road conditions as reported by the community. Staff verification actions require auditing.

## Acceptance criteria

- [x] A valid report creates a record with spatial point and returns 201.
- [x] A report outside bbox does not appear. Invalid bbox gets 400.
- [x] Public GeoJSON includes no private reporter metadata and excludes rejected records.
- [x] The map shows report age and verification. GPS denial permits manual pin selection.
- [x] The map labels observations and road conditions as community reports.
- [x] Input validation, service tests and bbox integration test pass.

## Implementation order

1. Migration + indexed geometry → 2. DTO/entity/service/controller → 3. bbox query + tests → 4. Next.js form → 5. MapLibre markers → 6. staff verification → 7. optional photo upload.
