#!/usr/bin/env bash
set -euo pipefail

# Layout under the root:
#   .env            production settings, kept only on the server
#   repo/           clone of the Gitea mirror, which only receives main after CI passes
#   releases/<id>/  one built copy of the app per deploy
#   current         symlink to the release systemd runs
root="${PROLIIGE_ROOT:-/opt/proliige}"
service="${PROLIIGE_SERVICE:-proliige}"
port=3000
keep_releases=3
release=""

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

main() {
  cd "$root"

  lock
  require_env
  update_code

  local previous
  release="releases/$(date +%Y%m%d-%H%M%S)-$(git -C repo rev-parse --short HEAD)"
  previous=$(readlink current || true)
  trap discard_failed_release EXIT

  build_release "$release"
  migrate "$release"

  switch_to "$release"
  restart_service

  if ! wait_for_service; then
    roll_back "$previous"
    exit 1
  fi

  prune_releases
}

# Deploys queue up instead of building over each other.
lock() {
  exec 9> .deploy.lock
  flock 9
}

require_env() {
  if [[ ! -f .env ]]; then
    echo "env: $root/.env is missing" >&2
    exit 1
  fi
}

update_code() {
  git -C repo fetch --quiet origin main
  git -C repo reset --quiet --hard origin/main

  echo "code: at $(git -C repo log -1 --format='%h %s')"
}

# The live release keeps serving while the new one builds next to it.
build_release() {
  local release="$1"

  mkdir -p "$release"
  git -C repo archive HEAD | tar -x -C "$release"
  # next.config.ts and drizzle-kit read the settings at build and migrate time.
  ln -s "$root/.env" "$release/.env"

  (
    cd "$release"
    pnpm install --frozen-lockfile
    pnpm build
  )

  echo "build: $release"
}

# Runs before the switch, so migrations must still work with the release being replaced.
migrate() {
  local release="$1"

  (
    cd "$release"
    pnpm db:migrate
  )
}

switch_to() {
  local release="$1"

  ln -sfn "$release" current.next
  mv -Tf current.next current

  echo "release: current is $release"
}

restart_service() {
  sudo systemctl restart "$service"
  echo "service: restarted $service"
}

wait_for_service() {
  for _ in {1..30}; do
    if curl -fsS -o /dev/null "http://localhost:$port/"; then
      echo "health: up on port $port"
      return
    fi

    sleep 2
  done

  echo "health: $service did not answer on port $port" >&2
  journalctl -u "$service" -n 50 --no-pager >&2 || true
  return 1
}

# Code only; migrations that already ran stay applied.
roll_back() {
  local previous="$1"

  if [[ -z "$previous" ]]; then
    echo "rollback: no previous release" >&2
    return
  fi

  switch_to "$previous"
  restart_service
  echo "rollback: back on $previous" >&2
}

# A failed deploy leaves nothing behind that pruning could later keep over a good release.
discard_failed_release() {
  local status=$?

  if ((status != 0)) && [[ -n "$release" && "$(readlink current || true)" != "$release" ]]; then
    rm -rf "$release"
    echo "release: discarded $release" >&2
  fi
}

# Keeps the newest releases, and the live one even if it is older.
prune_releases() {
  local live old
  live=$(readlink current)

  find releases -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +$((keep_releases + 1)) |
    while read -r old; do
      if [[ "$old" != "$live" ]]; then
        rm -rf "$old"
        echo "prune: removed $old"
      fi
    done
}

# Run from repo/ by hand, update_code rewrites this file; exiting on the same line stops bash reading the new version.
main "$@"; exit
