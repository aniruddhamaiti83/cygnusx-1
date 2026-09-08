#!/bin/sh
set -eu
cd /workspace
node scripts/preview.mjs stop || true

if ! curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8000/api/cx1/health; then
  mkdir -p /workspace/backend/data
  PYTHONUNBUFFERED=1 python3 -m uvicorn app.main:app --app-dir /workspace/backend --host 127.0.0.1 --port 8000 >>/tmp/cx1-api.log 2>&1 &
  i=0
  while [ "$i" -lt 40 ]; do
    if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:8000/api/cx1/health; then
      break
    fi
    i=$((i + 1))
    sleep 0.25
  done
fi

if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
