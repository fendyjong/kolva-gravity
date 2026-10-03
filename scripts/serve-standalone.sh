#!/usr/bin/env bash
# Serve the last `pnpm build` exactly as the container does: .next/standalone/server.js
# with public/ and .next/static copied beside it.
# Usage: scripts/serve-standalone.sh <port> <database-path>
set -euo pipefail

port=${1:?usage: serve-standalone.sh <port> <database-path>}
database=${2:?usage: serve-standalone.sh <port> <database-path>}

cp -r public .next/standalone/
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/

# server.js changes into its own directory, so the database path must be absolute.
exec env PORT="$port" HOSTNAME=127.0.0.1 DATABASE_PATH="$(realpath -m "$database")" \
  node .next/standalone/server.js
