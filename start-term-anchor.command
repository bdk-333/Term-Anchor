#!/bin/bash
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install LTS (18+) from https://nodejs.org/"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "First run: npm install..."
  npm install
fi

if [ ! -f dist/index.html ]; then
  echo "First run: npm run build..."
  npm run build
fi

export TERM_ANCHOR_PORT="${TERM_ANCHOR_PORT:-8787}"
(sleep 1 && open "http://127.0.0.1:${TERM_ANCHOR_PORT}/") &
exec node scripts/term-anchor-server.mjs
