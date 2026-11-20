# Frontend guide — Next.js App Router

## Principles

Mobile-first, Thai-friendly labels, large touch targets, readable text, keyboard accessibility, manual location fallback, low-bandwidth tolerance. Never show SOS as successfully submitted before server acknowledgment. Treat map availability as optional for SOS submission.

## Page map

```text
apps/web/src/app/
├── (public)/
│   ├── page.tsx            # Welcome, shortcuts, disclaimer
│   ├── map/page.tsx        # Public flood observations
│   ├── report/new/page.tsx # Submit flood report
│   └── sos/
│       ├── new/page.tsx    # SOS request form
│       └── [id]/page.tsx   # Private tracking, secret not in URL
├── (staff)/
│   └── admin/
│       ├── login/page.tsx
│       └── (protected)/
│           ├── layout.tsx
│           ├── page.tsx          # Staff profile and sign-out
│           ├── sos/page.tsx      # Planned
│           ├── sos/[id]/page.tsx # Planned
│           └── rescue-teams/page.tsx # Planned
└── layout.tsx
```

## Feature structure

```text
apps/web/src/
├── components/ui/               # Buttons, inputs, alerts, skeletons
├── components/map/              # Client-only MapLibre layer
├── features/flood-reports/       # ReportForm, FloodMarker, API client
├── features/staff-auth/          # Staff sign-in, sign-out, server session check
├── features/sos/                 # SOS form, status timeline, token handling
├── features/coordinator/         # Queue, case panel, triage controls
├── features/rescue-teams/        # Team selector and availability
├── lib/api/                     # Typed fetch client, error handling
└── lib/config/                  # Environment validation
```

## Data fetching

- Load public flood map via bbox and time filters; debounce map movement, cache/revalidate carefully, show `lastUpdated` and verification state.
- Staff SOS queue polls at an agreed interval (e.g. 15–30s) while page visible; show last refresh timestamp and failed refresh banner. This is **not** a substitute for staffing/alerting.
- Client map is dynamically loaded; ensure a text/table fallback when map tiles fail.
- Use typed API responses and friendly error states. No private SOS in local analytics/error dumps.
- Each protected staff page checks the session through the server-side staff auth helper before requesting private data. Staff APIs enforce role and resource permissions separately.

## UI flows

### Flood report

Location GPS/manual pin → observed time/severity/road status → optional description/evidence → review → submit → success with report ID or clearly shown failure.

### SOS

Type of help → location GPS/manual pin → people count and minimal details → verify summary → submit with stable Idempotency Key → **received** only upon committed response; if network uncertain, **not confirmed** with safe retry guidance and verified alternative channels. Tracking needs secret scoped token; route `/sos/[id]` must not embed secret in URL.

### Staff triage

Sign in → queue → open private case → set priority/reason → select appropriate available team → assign with concurrency validation → track lifecycle/history. Show explicit unauthorized, conflict and stale-data states.

## Components / accessibility

- `LocationPicker` with map pin and accessible manual coordinates/address alternative.
- `FloodMap` distinguishing unverified reports and stale points; avoid 'safe' labels.
- `SOSSubmitStatus` with states `idle | submitting | received | unconfirmed | failed`.
- `SOSStatusTimeline` displays server-confirmed states only.
- `CoordinatorQueue` with filter, pagination, aging highlight, last refresh time.
- `ConfirmStatusDialog` requiring reason for sensitive transitions.

## Privacy

Separate public and private API clients. Never render full SOS API payload into public components; protect staff components on server and API. Do not persist bearer tracking tokens in URLs, error logs or third-party analytics. Have a documented browser storage/recovery policy before pilot.
