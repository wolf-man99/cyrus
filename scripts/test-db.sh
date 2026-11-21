#!/usr/bin/env bash
# Applies every migration to a throwaway local Postgres and runs the SQL tests in supabase/tests.
# Needs PostgreSQL 15+ binaries (initdb, pg_ctl, psql). Run as a non-root user, or as root with a `postgres` user present.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
WORK="$(mktemp -d)"
PORT="${PGPORT_TEST:-54329}"
AS=""
if [ "$(id -u)" = "0" ]; then chown postgres "$WORK"; AS="runuser -u postgres --"; fi

cleanup() { $AS "$PGBIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

$AS "$PGBIN/initdb" -D "$WORK/data" -A trust -U postgres >/dev/null
$AS "$PGBIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
PSQL=($AS "$PGBIN/psql" -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -f "$ROOT/supabase/tests/supabase_stubs.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  name="$(basename "$f" .sql)"
  # Optional fixture that seeds data before a migration, to prove the migration keeps it.
  if [ -f "$ROOT/supabase/tests/fixtures/$name.before.sql" ]; then
    echo "seed     $name.before.sql"
    "${PSQL[@]}" -f "$ROOT/supabase/tests/fixtures/$name.before.sql"
  fi
  echo "migrate  $(basename "$f")"
  "${PSQL[@]}" -1 -f "$f"
done
for f in "$ROOT"/supabase/tests/*.test.sql; do
  echo "test     $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
echo "database tests passed"
