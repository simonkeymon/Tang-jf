#!/usr/bin/env bash
set -euo pipefail

docker compose exec server pnpm --filter @tang/server run drizzle:generate || true
