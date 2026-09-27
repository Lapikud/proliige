#!/usr/bin/env bash
set -euo pipefail

main() {
  : "${DEPLOY_HOST:?}" "${DEPLOY_USER:?}" "${DEPLOY_SSH_KEY:?}" "${DEPLOY_KNOWN_HOSTS:?}" "${ENV_FILE:?}"

  # Not local: the EXIT trap runs after main returns.
  ssh_dir=$(mktemp -d)
  trap 'rm -rf "$ssh_dir"' EXIT

  printf '%s\n' "$DEPLOY_SSH_KEY" > "$ssh_dir/key"
  printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$ssh_dir/known_hosts"
  chmod 600 "$ssh_dir/key"

  # The server pins this key to deploy.sh, which reads the .env from stdin.
  printf '%s\n' "$ENV_FILE" | ssh \
    -i "$ssh_dir/key" \
    -p "${DEPLOY_PORT:-22}" \
    -o IdentitiesOnly=yes \
    -o UserKnownHostsFile="$ssh_dir/known_hosts" \
    -o BatchMode=yes \
    -o ServerAliveInterval=30 \
    "$DEPLOY_USER@$DEPLOY_HOST"
}

main "$@"
