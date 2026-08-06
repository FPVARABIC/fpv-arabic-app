#!/usr/bin/env bash
# Bring up a scratch PostgreSQL for the RLS and Storage specs.
#
# The specs need a real database because a policy can only be proven by being
# attacked, and there is no hosted project to attack from here. This starts a
# throwaway cluster on port 55432; it holds no real data and is safe to delete.
#
# postgres refuses to run as root, so an unprivileged user owns the cluster.
set -euo pipefail
PORT="${RLS_TEST_PORT:-55432}"
PGBIN=/usr/lib/postgresql/16/bin
DATA=/home/pgtest/pgdata

if psql -h /tmp -p "$PORT" -U postgres -d postgres -tAc 'select 1' >/dev/null 2>&1; then
  echo "postgres already up on $PORT"; exit 0
fi

id -u pgtest >/dev/null 2>&1 || useradd -m pgtest
[ -f "$DATA/PG_VERSION" ] || su pgtest -c "PATH=$PGBIN:\$PATH initdb -D $DATA -U postgres --auth=trust" >/dev/null
su pgtest -c "PATH=$PGBIN:\$PATH pg_ctl -D $DATA -l /home/pgtest/pglog -o '-p $PORT -k /tmp' -w start" >/dev/null
echo "postgres started on $PORT"
