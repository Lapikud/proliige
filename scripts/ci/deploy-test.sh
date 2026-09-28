#!/usr/bin/env bash
set -euo pipefail

# Runs deploy.sh against a scratch root, with pnpm, sudo, curl and journalctl replaced by stubs.
main() {
  cd "$(dirname "$0")/../.."
  deploy_script="$PWD/scripts/deploy/deploy.sh"

  work=$(mktemp -d)
  trap 'rm -rf "$work"' EXIT

  make_stubs
  make_root

  test_missing_env_fails
  test_first_deploy
  test_keeps_three_releases
  test_failed_health_rolls_back
  test_failed_build_changes_nothing

  echo "deploy tests: all passed"
}

make_stubs() {
  mkdir "$work/bin"
  stub pnpm 'echo "pnpm $*"; [[ "$1" != build || -z "${FAIL_BUILD:-}" ]]'
  stub sudo 'echo "$*" >> "$STUB_LOG"'
  stub curl '[[ -z "${FAIL_HEALTH:-}" ]]'
  stub journalctl 'true'
  stub sleep 'true'
}

stub() {
  printf '#!/usr/bin/env bash\n%s\n' "$2" > "$work/bin/$1"
  chmod +x "$work/bin/$1"
}

# A bare origin with one commit of the current tree, and root/repo cloned from it.
make_root() {
  local seed="$work/seed"
  mkdir "$seed"
  git archive HEAD | tar -x -C "$seed"
  git -C "$seed" init --quiet --initial-branch main
  git -C "$seed" add --all
  git -C "$seed" -c user.name=test -c user.email=test@example.invalid commit --quiet -m seed
  git clone --quiet --bare "$seed" "$work/origin.git"

  mkdir "$work/root"
  git clone --quiet "$work/origin.git" "$work/root/repo"
}

# Each release is named by the second it started, so deploys in a test are a second apart.
deploy() {
  command sleep 1
  env PATH="$work/bin:$PATH" PROLIIGE_ROOT="$work/root" STUB_LOG="$work/sudo.log" "$@" \
    bash "$deploy_script" > "$work/out.log" 2>&1
}

test_missing_env_fails() {
  if deploy; then
    fail "deploy passed without a .env"
  fi

  [[ ! -e "$work/root/releases" ]] || fail "built a release without a .env"
  pass "missing .env fails"
}

test_first_deploy() {
  echo "A=1" > "$work/root/.env"
  deploy || fail "first deploy failed"

  [[ -f "$work/root/current/package.json" ]] || fail "current has no app"
  expect_equal "$(readlink "$work/root/current/.env")" "$work/root/.env" "release links .env"
  expect_equal "$(release_count)" "1" "releases after first deploy"
  pass "first deploy"
}

test_keeps_three_releases() {
  local _
  for _ in 1 2 3; do
    deploy || fail "deploy failed"
  done

  expect_equal "$(release_count)" "3" "releases after four deploys"
  expect_equal "$(readlink "$work/root/current")" "$(newest_release)" "current is newest"
  pass "keeps three releases"
}

test_failed_health_rolls_back() {
  local before
  before=$(readlink "$work/root/current")
  : > "$work/sudo.log"

  if deploy FAIL_HEALTH=1; then
    fail "deploy passed with a failing health check"
  fi

  expect_equal "$(readlink "$work/root/current")" "$before" "current after rollback"
  expect_equal "$(release_count)" "3" "releases after rollback"
  expect_equal "$(grep -c 'systemctl restart' "$work/sudo.log")" "2" "restarts (new, then previous)"
  pass "failed health check rolls back"
}

test_failed_build_changes_nothing() {
  local before
  before=$(readlink "$work/root/current")
  : > "$work/sudo.log"

  if deploy FAIL_BUILD=1; then
    fail "deploy passed with a failing build"
  fi

  expect_equal "$(readlink "$work/root/current")" "$before" "current after failed build"
  expect_equal "$(release_count)" "3" "releases after failed build"
  [[ ! -s "$work/sudo.log" ]] || fail "service restarted after a failed build"
  pass "failed build changes nothing"
}

release_count() {
  find "$work/root/releases" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' '
}

newest_release() {
  find "$work/root/releases" -mindepth 1 -maxdepth 1 -type d -printf 'releases/%f\n' | sort | tail -n 1
}

expect_equal() {
  if [[ "$1" != "$2" ]]; then
    fail "$3: expected '$2', got '$1'"
  fi
}

pass() {
  echo "ok: $1"
}

fail() {
  echo "not ok: $1" >&2
  echo "--- last deploy output" >&2
  cat "$work/out.log" >&2 || true
  exit 1
}

main "$@"
