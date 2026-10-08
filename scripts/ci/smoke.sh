#!/usr/bin/env bash
set -euo pipefail

# Starts the built app against a migrated database and checks that key routes answer without an error.
port=3100
base="http://localhost:$port"
routes=(
  /
  /login
  /tasks
  /api/feed
  /api/leaderboard
  /robots.txt
  /sitemap.xml
  /manifest.webmanifest
)

main() {
  cd "$(dirname "$0")/../.."

  pnpm db:migrate

  log=$(mktemp)
  pnpm start -p "$port" > "$log" 2>&1 &
  server=$!
  trap stop_server EXIT

  wait_for_server
  check_routes
}

stop_server() {
  kill "$server" 2>/dev/null || true
  wait "$server" 2>/dev/null || true
}

wait_for_server() {
  for _ in {1..30}; do
    if curl -fs -o /dev/null "$base/robots.txt"; then
      return
    fi

    if ! kill -0 "$server" 2>/dev/null; then
      fail "server: exited before answering"
    fi

    sleep 1
  done

  fail "server: did not answer on port $port"
}

check_routes() {
  local route status failed=0

  for route in "${routes[@]}"; do
    status=$(curl -sS -o /dev/null -w '%{http_code}' "$base$route" || echo 000)
    echo "$status $route"

    if ((status < 200 || status >= 400)); then
      failed=1
    fi
  done

  if ((failed)); then
    fail "routes: some failed"
  fi
}

fail() {
  echo "$1" >&2
  echo "--- server log" >&2
  cat "$log" >&2
  exit 1
}

main "$@"
