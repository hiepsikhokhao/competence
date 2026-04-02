#!/bin/sh
set -e

echo "[entrypoint] Running database initialization..."
node scripts/init-db.mjs

echo "[entrypoint] Starting application..."
exec node server.js
