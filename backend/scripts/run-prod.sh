#!/usr/bin/env sh
set -e
MIGRATE_URL="${DIRECT_URL:-$DATABASE_URL}"
if [ -n "$MIGRATE_URL" ]; then
  DATABASE_URL="$MIGRATE_URL" npx prisma migrate deploy
else
  echo "No DATABASE_URL/DIRECT_URL set, skipping migrations"
fi
exec node dist/server.js
