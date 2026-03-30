#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -f dist/index.html ]; then
  echo "No dist/ folder. Run: npm run build"
  exit 1
fi
exec npx --yes vite preview --host 127.0.0.1 --port 4173 --strictPort --open
