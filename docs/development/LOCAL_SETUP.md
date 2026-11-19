# Local development setup

Use Node.js 24 LTS (the project pins a release in [`.node-version`](../../.node-version)), Corepack with the pnpm version in [`package.json`](../../package.json), and Docker Desktop or a compatible Docker Compose installation. On Apple Silicon, verify that your runtime can run the PostgreSQL/PostGIS image for the intended platform.

The workspace uses the official npm registry in [`.npmrc`](../../.npmrc). If a shell-level registry override points to a mirror that returns 404 for a locked version, update that override before installing.

## Start the foundation

For a new checkout, copy each template to its runtime file. Use `Copy-Item` in PowerShell.

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Replace `POSTGRES_PASSWORD` in the root `.env` and `DATABASE_PASSWORD` in `apps/api/.env` with the same local password. When using the Compose database, match the API's username, database name, and port with the values in the root `.env`.

For an existing checkout with a single root `.env`, move the API and web values into the files listed below. Keep the Compose values at the root and include `DATABASE_PORT` in both the root and API files.

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
docker compose up -d --wait postgres
pnpm db:migrate
pnpm dev
```

To run the apps in separate terminals, use `pnpm --filter @floodaid/api start:dev` and `pnpm --filter @floodaid/web dev`.

| Surface | Default address |
|---|---|
| Web | [localhost:3000](http://localhost:3000) |
| API readiness | [127.0.0.1:4000/api/v1/health](http://127.0.0.1:4000/api/v1/health) |
| Swagger UI | [127.0.0.1:4000/api/v1/docs](http://127.0.0.1:4000/api/v1/docs) |
| OpenAPI JSON | [127.0.0.1:4000/api/v1/openapi.json](http://127.0.0.1:4000/api/v1/openapi.json) |
| PostgreSQL | `127.0.0.1:5433` |

The web home page checks API readiness on each request. It reports when the API is unreachable or PostGIS is unavailable. Refresh the page after restoring the connection.

## Environment

Compose reads the root `.env`. The API start, migration, and database integration scripts read `apps/api/.env`. Next.js loads `apps/web/.env.local`. Values already set in the process environment take precedence.

| File | Settings | Purpose |
|---|---|---|
| Root `.env` | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Compose database initialization |
| Root `.env` | `DATABASE_PORT` | Compose host port mapping, defaulting to `5433` |
| `apps/api/.env` | `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_NAME` | Required API and TypeORM CLI connection settings |
| `apps/api/.env` | `API_HOST`, `API_PORT` | API listener, defaulting to `127.0.0.1:4000` |
| `apps/api/.env` | `WEB_ORIGIN` | Allowed browser origin, defaulting to `http://localhost:3000`. Use a scheme and host with an optional port |
| `apps/web/.env.local` | `NEXT_PUBLIC_API_URL` | API base URL, including `/api/v1`. Treat all `NEXT_PUBLIC_` settings as public |

Keep real credentials out of Git and browser-facing settings. For deployed environments, configure database credentials in the API and migration processes, use a private network for PostgreSQL, and grant extension creation privileges to the provisioning or migration role.

## Database migrations

`pnpm db:migrate` compiles the NestJS workspace and applies TypeORM migrations in order. The API starts with schema synchronization and automatic migrations disabled.

The initial migration ensures PostGIS and pgcrypto are available. Reverting it removes its migration history entry and preserves the extensions, which can be provisioned by the database image.

```bash
pnpm --filter @floodaid/api migration:revert
pnpm --filter @floodaid/api migration:generate src/database/migrations/DescribeChange
docker compose exec postgres psql -U floodaid -d floodaid -c 'SELECT PostGIS_Version();'
```

Migration generation compares registered entities with the configured database. Run it against a local development database and review the generated SQL before applying it.

Use `docker compose down` to stop the local database and preserve its volume.

## Automated checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:integration
```

The default tests exercise health and OpenAPI over HTTP and run without Docker. The integration test requires a running database with the migrations applied. Foundation CI runs both against the pinned workspace dependencies.
