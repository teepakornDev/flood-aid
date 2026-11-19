# ADR-0001: Modular Monolith for MVP

**Status:** Accepted  
**Date:** 2026-11-18

## Context
Solo developer must deliver a verified real-world workflow quickly with limited operational overhead.

## Decision
Use one NestJS backend with explicit modules (Auth, Flood Reports, SOS, Rescue Teams, Audit) and one PostgreSQL/PostGIS database. Use REST and polling first; no Kafka, microservices or Kubernetes in MVP.

## Consequences
Simpler local setup, migrations and transactions; clear module boundaries allow later extraction when justified by measured scale or independent lifecycle requirements. Avoid tightly coupling modules via direct table mutation outside defined services.
