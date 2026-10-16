#!/usr/bin/env bash
# Fails when a model.ts change has no migration, so db:migrate never runs against a stale migration set.
set -euo pipefail

scratch=$(mktemp -d ./.migration-check.XXXXXX)
trap 'rm -rf "$scratch"' EXIT
cp -r migrations/. "$scratch"

output=$(pnpm exec drizzle-kit generate --dialect postgresql --schema ./src/infra/db/schema.ts --out "$scratch" --name check 2>&1)
if ! grep -q "No schema changes" <<<"$output"; then
  echo "The schema has changes that no migration covers. Run: pnpm db:generate <name>" >&2
  exit 1
fi
