# ADR-0002: Public Flood Data and Private SOS Data

**Status:** Accepted  
**Date:** 2026-11-18

## Context
Flood observation maps should be public; emergency SOS requests contain highly sensitive location, contact and vulnerability details.

## Decision
Only sanitized flood reports may be returned from public map endpoints. SOS records and rescue assignments require resident tracking-token scope or staff role/assignment permissions. No public SOS markers or logs with tokens, contacts or exact SOS location.

## Consequences
Distinct response DTOs, separate controllers/routes and authorization tests are mandatory. Field additions to SOS cannot become public implicitly. Moderation and privacy review are required even for public flood observations.
