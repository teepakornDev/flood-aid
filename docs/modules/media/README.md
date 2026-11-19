# Module: Private Media & Evidence

**Status:** Planned · **Priority:** P2 (optional early feature) · **Dependencies:** Object storage, API security

## Purpose

Let residents attach an optional flood-condition photo. Media is evidence and must be treated as untrusted and potentially identifying. **Never require photos to submit SOS.**

## In scope

- Optional image upload for Flood Report (SOS image attachment is deferred unless separately specified).
- Store private blobs in S3-compatible storage, store only metadata/pointer in DB.
- Validate MIME/content signature, file size, allowed extensions, and limits per report. Re-encode/sanitize where practical; remove EXIF location metadata where possible.
- Serve authorized evidence through time-limited signed access after proper permission checks; publicly visible evidence requires moderation and a separate privacy decision.

## Data

`report_evidence(id, report_id, storage_key, media_type, created_at)`; consider `size_bytes`, `scan_status`, `uploaded_by`, `moderation_status` before pilot. Object names must be opaque, non-guessable and must not embed personal data.

## API proposal

- `POST /api/v1/flood-reports/:id/evidence` (abuse-protected upload)
- `GET /api/v1/admin/flood-reports/:id/evidence` (authorized media metadata/retrieval)

These endpoints are **proposals**; choose direct upload vs server streaming and update OpenAPI before implementing.

## Acceptance criteria

- [ ] Upload with invalid/oversized/unsafe file is rejected.
- [ ] Private bucket cannot be enumerated publicly.
- [ ] Public report API does not expose raw storage keys or private signed links.
- [ ] EXIF handling and image moderation privacy policy documented.
- [ ] SOS works without any image upload.
