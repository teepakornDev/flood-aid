# FloodAid — Flood Response Platform

**Status:** planned MVP for a supervised pilot in Thailand. **Team:** one developer. **Language:** English. **Approach:** modular monolith, mobile-first, privacy-first.

FloodAid helps residents report flooding and request assistance, and helps authorized coordinators triage and assign rescue work. **It is not an operational emergency service until an actual response partner agrees to staff it.** A request being received by the server does not guarantee rescue.

## Documentation quick start

1. Read [docs/README.md](docs/README.md) for the complete index.
2. Read [AGENTS.md](AGENTS.md) if you are an AI coding assistant.
3. Implement features via [docs/modules/](docs/modules/) one by one.
4. Follow [docs/development/ROADMAP.md](docs/development/ROADMAP.md) in sequence.
5. Treat [docs/architecture/](docs/architecture/) as the shared architecture and security rules.

Start the workspace using the [local setup guide](docs/development/LOCAL_SETUP.md). The first product feature is the [Flood Reports vertical slice](docs/modules/flood-reports/README.md).

## Technology

Next.js (App Router) + React + TypeScript + Tailwind + MapLibre; NestJS + TypeORM + class-validator + OpenAPI; PostgreSQL 17 + PostGIS 3.5; pnpm workspaces; Docker Compose for development; S3-compatible private object storage for evidence.

**MVP exclusions:** Kafka, Kubernetes, microservices, AI prediction, safe-route optimization, public SOS map, shelter inventory and donation logistics.
