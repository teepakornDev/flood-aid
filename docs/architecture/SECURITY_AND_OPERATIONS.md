# Security, privacy and operational readiness

## Safety principle

FloodAid is a **coordination tool**, not a substitute for verified emergency services. Do not advertise SOS as actively monitored until named partners, staffed schedules, on-call coverage, backup contacts and incident protocols exist. The application **must not** claim roads are safe based solely on crowd reports or GPS distance.

## Data classification

| Classification | Examples | Allowed exposure |
|---|---|---|
| Public | Sanitized flood coordinates, observation time, verification label | Public flood map |
| Restricted | SOS location, user contact, vulnerable-person notes, assignments, rescue team presence | Authorized responders/coordinators on a need-to-know basis |
| Secrets | Tracking token, password hash, signing keys, DB credentials | Never in public APIs, logs or client bundles |

## Core controls

- HTTPS/TLS everywhere outside localhost; secure cookies or properly validated bearer authentication; staff login/session expiry and revocation.
- Deny-by-default role/assignment-scoped access, audit access to sensitive cases, redact private fields in logs/errors.
- Public form abuse controls: rate limiting, reasonable validation, duplicate detection and manual moderation. Avoid overly aggressive controls that prevent genuine emergency submissions.
- High-entropy SOS tracking token, stored as hash; **no token in URLs**. Staff sessions and resident tracking must not share authorization assumptions.
- Private object bucket, server-side MIME/size/content validation, EXIF metadata handling, signed URLs with short expiry only after authorization.
- Database access via least-privilege user. Encrypt backups and sensitive contact data with managed keys, and rotate secrets.
- Have a documented retention/deletion policy aligned with applicable privacy requirements; preserve necessary incident and audit records according to approved policy.
- Use request IDs and structured metrics. Never store real SOS PII in demo fixtures or public analytics.

## Operational checklist before any public pilot

- [ ] Confirm local rescue/coordination organization, staffing coverage, escalation path and verified manual emergency contact fallback.
- [ ] Conduct user research/accessibility review (Thai language, large buttons, low bandwidth, manual location).
- [ ] Test authorization boundaries for all public/staff endpoints and files.
- [ ] Test SOS creation under retries, slow networks, duplicates, token loss and DB failures.
- [ ] Test concurrent assignment and invalid status transitions.
- [ ] Configure alerting for SOS not acknowledged within operational policy; define on-call procedures.
- [ ] Backup and **test restore** for DB and object storage; have RPO/RTO targets agreed with the partner.
- [ ] Rehearse with simulated incidents, not real emergencies; clearly mark test data.
- [ ] Publish accurate limitations and data handling notices for residents.

## Degraded modes

- API unreachable: show "not submitted/confirmation unavailable", offer verified alternative contact channel; allow drafting locally, but **never show queued offline SOS as received**.
- GPS denied: manual pin/location description.
- Map tiles fail: allow text-based reporting, avoid blocking SOS flow.
- Staff alert delivery fails: keep case in persisted queue, raise system-health alert and require manual polling/monitoring.
- Database unavailable: health/readiness fails, stop claiming success; invoke operational fallback.

## Metrics worth tracking

Received SOS count; age of oldest untriaged case; case acknowledgment lag; assignment acceptance time; API 5xx rate; failed staff login; token abuse rate; PostGIS query latency; backups and restore health. No public export of private SOS details.
