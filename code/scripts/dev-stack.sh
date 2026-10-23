#!/usr/bin/env bash
#
# Starts every Vero service plus the Vite dev server for local development using bun dev.
#
#   ./scripts/dev-stack.sh          start everything (logs in .dev-logs/)
#   ./scripts/dev-stack.sh stop     stop everything on the Vero ports
#   ./scripts/dev-stack.sh status   show what is listening
#
# Requires PostgreSQL and Redis to already be running locally.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/.dev-logs"
PORTS=(3000 8001 8002 8003 8004 8005 8006 8007 5005)

# service:port
SERVICES=(
  "auth-service:8001"
  "board-service:8002"
  "notes-service:8003"
  "project-service:8004"
  "chat-service:8005"
  "notification-service:8006"
  "meet-service:8007"
)

free_ports() {
  echo "→ Releasing Vero ports…"
  for port in "${PORTS[@]}"; do
    # `lsof -t` lists only pids, which is all we need to signal.
    pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      echo "   port $port → killing $(echo "$pids" | tr '\n' ' ')"
      # shellcheck disable=SC2086
      kill $pids 2>/dev/null || true
    fi
  done
  sleep 2
  for port in "${PORTS[@]}"; do
    pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    # shellcheck disable=SC2086
    [[ -n "$pids" ]] && kill -9 $pids 2>/dev/null || true
  done
}

status() {
  printf '%-8s %s\n' PORT STATE
  for port in "${PORTS[@]}"; do
    if lsof -t -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      printf '%-8s %s\n' "$port" "listening"
    else
      printf '%-8s %s\n' "$port" "-"
    fi
  done
}

case "${1:-start}" in
  stop)
    free_ports
    echo "✓ Stopped."
    exit 0
    ;;
  status)
    status
    exit 0
    ;;
esac

command -v bun >/dev/null 2>&1 || { echo "❌ bun is required but not installed or not found in PATH."; exit 1; }
command -v psql >/dev/null 2>&1 && psql -lqt >/dev/null 2>&1 || echo "⚠️  PostgreSQL does not look reachable."
redis-cli ping >/dev/null 2>&1 || echo "⚠️  Redis does not look reachable on :6379."

free_ports
mkdir -p "$LOG_DIR"

echo "→ Starting services with bun dev…"
for entry in "${SERVICES[@]}"; do
  IFS=: read -r name port <<<"$entry"
  ( cd "$ROOT/services/$name" && bun dev >"$LOG_DIR/$name.log" 2>&1 & )
  echo "   $name → :$port"
done

echo "→ Starting the web app with bun dev…"
( cd "$ROOT/apps/web" && bun dev --host >"$LOG_DIR/web.log" 2>&1 & )

echo "→ Waiting for health checks…"
for _ in {1..30}; do
  ready=0
  for entry in "${SERVICES[@]}"; do
    IFS=: read -r _ port <<<"$entry"
    curl -sf -m 1 "http://localhost:$port/health" >/dev/null 2>&1 && ready=$((ready + 1))
  done
  [[ $ready -ge ${#SERVICES[@]} ]] && break
  sleep 2
done

echo
status
echo
echo "✓ Web app:  http://localhost:3000"
echo "  Logs:     $LOG_DIR/*.log"
echo "  Stop:     ./scripts/dev-stack.sh stop"
