#!/usr/bin/env bash
#
# Starts every Vero service plus the Vite dev server for local development using bun dev.
#
#   ./scripts/dev-stack.sh          start everything, ai-worker included (logs in .dev-logs/)
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
  echo "â Releasing Vero portsâ¦"
  for port in "${PORTS[@]}"; do
    # `lsof -t` lists only pids, which is all we need to signal.
    pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      echo "   port $port â killing $(echo "$pids" | tr '\n' ' ')"
      # shellcheck disable=SC2086
      kill $pids 2>/dev/null || true
    fi
  done
  # `tsx watch` parents respawn their server when it is killed, and ai-worker
  # listens on no port at all — stop every watcher of this checkout by its
  # command line, or old copies keep fighting over the ports.
  pkill -f "$ROOT/.*tsx/dist/cli.mjs watch" 2>/dev/null || true
  pkill -f "$ROOT/.*vite/bin/vite.js" 2>/dev/null || true
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
    echo "â Stopped."
    exit 0
    ;;
  status)
    status
    exit 0
    ;;
esac

command -v bun >/dev/null 2>&1 || { echo "â bun is required but not installed or not found in PATH."; exit 1; }
command -v psql >/dev/null 2>&1 && psql -lqt >/dev/null 2>&1 || echo "â ï¸  PostgreSQL does not look reachable."
redis-cli ping >/dev/null 2>&1 || echo "â ï¸  Redis does not look reachable on :6379."

free_ports
mkdir -p "$LOG_DIR"

# macOS litters non-APFS drives with ._* AppleDouble files, which globs such as
# *.model.ts and *.test.ts then pick up as source.
find "$ROOT" -name '._*' -not -path '*/node_modules/*' -delete 2>/dev/null || true

echo "â Building @repo/sharedâ¦"
( cd "$ROOT/packages/shared" && bun run build >"$LOG_DIR/shared.log" 2>&1 ) || echo "â ï¸  @repo/shared failed to build â see $LOG_DIR/shared.log"

echo "â Starting services with bun devâ¦"
for entry in "${SERVICES[@]}"; do
  IFS=: read -r name port <<<"$entry"
  ( cd "$ROOT/services/$name" && bun dev >"$LOG_DIR/$name.log" 2>&1 & )
  echo "   $name â :$port"
done

echo "â Starting ai-worker with bun devâ¦"
( cd "$ROOT/ai-worker" && bun dev >"$LOG_DIR/ai-worker.log" 2>&1 & )

echo "â Starting the web app with bun devâ¦"
( cd "$ROOT/apps/web" && bun dev --host >"$LOG_DIR/web.log" 2>&1 & )

echo "â Waiting for health checksâ¦"
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
echo "â Web app:  http://localhost:3000"
echo "  Logs:     $LOG_DIR/*.log"
echo "  Stop:     ./scripts/dev-stack.sh stop"
