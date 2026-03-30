#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -f dist/index.html ]; then
  echo "No dist/ folder. Run: npm run build"
  exit 1
fi
export TERM_ANCHOR_PORT="${TERM_ANCHOR_PORT:-8787}"
(sleep 1 && open "http://127.0.0.1:${TERM_ANCHOR_PORT}/") &
exec node scripts/term-anchor-server.mjs
