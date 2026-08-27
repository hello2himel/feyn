#!/usr/bin/env bash
# ============================================================
# scripts/local-pg.sh — throwaway Postgres for the schema tests
#
# The schema tests need a real Postgres, not a mock: they assert on
# RLS behaviour, security definer functions and trigger side effects,
# none of which can be faked. But they must never run against a real
# Supabase project, because docs/schema.sql drops every Feyn table
# first.
#
# So this starts a private cluster on a unix socket in /tmp — no TCP
# port, no password, nothing shared. Delete the data dir and it's gone.
#
# Postgres comes from the `embedded-postgres` devDependency, which
# ships prebuilt binaries, so there is nothing to install system-wide
# and no sudo needed.
#
#   ./scripts/local-pg.sh start
#   npm run test:schema
#   ./scripts/local-pg.sh stop
# ============================================================
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="${FEYN_PGDATA:-/tmp/feyn-pgdata}"
PGSOCK="${FEYN_PGSOCK:-/tmp/feyn-pgrun}"
PGPORT="${FEYN_PGPORT:-55432}"

# Locate the platform-specific binaries embedded-postgres installed.
INITDB="$(find "$REPO/node_modules/@embedded-postgres" -name initdb -type f 2>/dev/null | head -1 || true)"
if [ -z "$INITDB" ]; then
  echo "Postgres binaries not found. Run: npm install" >&2
  exit 1
fi
PGROOT="$(cd "$(dirname "$INITDB")/.." && pwd)"

export LD_LIBRARY_PATH="$PGROOT/lib:${LD_LIBRARY_PATH:-}"
export PATH="$PGROOT/bin:$PATH"

case "${1:-start}" in
  start)
    if [ ! -d "$PGDATA" ]; then
      initdb -D "$PGDATA" -U postgres --auth=trust --encoding=UTF8 --locale=C >/dev/null
    fi
    mkdir -p "$PGSOCK"
    if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
      echo "already running on $PGSOCK:$PGPORT"
    else
      # listen_addresses='' → socket only, nothing on the network.
      pg_ctl -D "$PGDATA" \
        -o "-k $PGSOCK -p $PGPORT -c listen_addresses=''" \
        -l "$PGDATA/server.log" start >/dev/null
      echo "started on $PGSOCK:$PGPORT"
    fi
    ;;
  stop)
    pg_ctl -D "$PGDATA" stop >/dev/null 2>&1 && echo "stopped" || echo "not running"
    ;;
  destroy)
    pg_ctl -D "$PGDATA" stop >/dev/null 2>&1 || true
    rm -rf "$PGDATA" "$PGSOCK"
    echo "destroyed $PGDATA"
    ;;
  *)
    echo "usage: $0 {start|stop|destroy}" >&2
    exit 1
    ;;
esac
