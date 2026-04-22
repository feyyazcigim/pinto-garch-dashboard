#!/bin/sh
# Explicit startup wrapper — makes the PORT expansion and any early
# failures visible in Railway's Deploy Logs, which is otherwise silent
# between "Starting Container" and uvicorn's own first log line.
set -e

: "${PORT:=8000}"
echo "[pinto-garch] python: $(python --version 2>&1)"
echo "[pinto-garch] uvicorn starting on 0.0.0.0:${PORT}"
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT}" \
  --log-level info \
  --access-log
