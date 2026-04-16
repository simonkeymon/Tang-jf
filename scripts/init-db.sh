#!/usr/bin/env bash
set -euo pipefail

docker compose up -d postgres
docker compose exec server pnpm --filter @tang/server exec drizzle-kit migrate --config drizzle.config.ts
