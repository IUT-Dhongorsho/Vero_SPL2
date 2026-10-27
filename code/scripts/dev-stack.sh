#!/usr/bin/env bash
#
# ==============================================================================
# Vero Multi-Instance Clustered Stack & Public Ingress Tunnel Runner
# ==============================================================================
#
# Steps executed:
#   1. Build the web application (@repo/shared and apps/web -> dist/)
#   2. Kill all processes utilizing the cluster ports (3000, 8001-8007, 8011-8017, 5005, 5015)
#   3. Start all primary & secondary services on their designated ports, plus Nginx gateway
#   4. Validate zrok2 installation & environment status (with setup guide if missing)
#   5. Establish public tunnel via: zrok2 share public http://localhost:3000 -n public:vero-spl2
#
# Commands:
#   ./scripts/dev-stack.sh              Full startup with build, clustering, and zrok2 tunnel
#   ./scripts/dev-stack.sh --no-tunnel  Start services and Nginx without launching zrok2
#   ./scripts/dev-stack.sh stop         Terminate all cluster processes and Nginx
#   ./scripts/dev-stack.sh status       Display real-time listener status for all ports
#   ./scripts/dev-stack.sh monitoring [down]
#                                       Start (or stop) Prometheus :9090 and Grafana :3001
#                                       in Docker, scraping the services above
#

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$ROOT/.dev-logs"

# Primary ports (8001-8007, 5005)
PRIMARY_PORTS=(8001 8002 8003 8004 8005 8006 8007 5005)
# Secondary ports (8011-8017, 5015)
SECONDARY_PORTS=(8011 8012 8013 8014 8015 8016 8017 5015)
# Gateway port
GATEWAY_PORT=3000
# ai-worker serves /metrics here for Prometheus
AI_METRICS_PORT=8008

ALL_PORTS=("$GATEWAY_PORT" "${PRIMARY_PORTS[@]}" "${SECONDARY_PORTS[@]}" "$AI_METRICS_PORT")

# Service registry: name:primary_port:secondary_port
SERVICES=(
  "auth-service:8001:8011"
  "board-service:8002:8012"
  "notes-service:8003:8013"
  "project-service:8004:8014"
  "chat-service:8005:8015"
  "notification-service:8006:8016"
  "meet-service:8007:8017"
)

# ------------------------------------------------------------------------------
# Process cleanup & Port Release
# ------------------------------------------------------------------------------
free_ports() {
  echo "→ [Step 2] Releasing all Vero ports and stopping previous processes…"

  # Stop Nginx cleanly if running
  if [[ -f "$ROOT/infra/nginx/temp/nginx.pid" ]]; then
    nginx -p "$ROOT/infra/nginx" -s stop 2>/dev/null || true
  fi
  pkill -f "nginx.*nginx.conf" 2>/dev/null || true
  pkill -f "zrok.*share public.*3000" 2>/dev/null || true

  for port in "${ALL_PORTS[@]}"; do
    pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      echo "   port $port → terminating $(echo "$pids" | tr '\n' ' ')"
      # shellcheck disable=SC2086
      kill $pids 2>/dev/null || true
    fi
  done

  # Terminate leftover watchers and Node/Bun background processes for this workspace
  pkill -f "$ROOT/.*tsx/dist/cli.mjs watch" 2>/dev/null || true
  pkill -f "$ROOT/.*vite/bin/vite.js" 2>/dev/null || true
  pkill -f "$ROOT/services/.*" 2>/dev/null || true
  pkill -f "$ROOT/ai-worker/.*" 2>/dev/null || true

  sleep 1

  # Force-kill any stubborn remaining listeners
  for port in "${ALL_PORTS[@]}"; do
    pids="$(lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
    fi
  done
}

# ------------------------------------------------------------------------------
# Cluster Status Report
# ------------------------------------------------------------------------------
status() {
  echo "=== Vero Cluster Port Status ==="
  printf '%-8s %-24s %-12s %s\n' "PORT" "SERVICE" "ROLE" "STATE"
  printf '%-8s %-24s %-12s %s\n' "----" "-------" "----" "-----"

  # Gateway
  if lsof -t -iTCP:"$GATEWAY_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    printf '%-8s %-24s %-12s %s\n' "$GATEWAY_PORT" "nginx-gateway" "edge" "listening"
  else
    printf '%-8s %-24s %-12s %s\n' "$GATEWAY_PORT" "nginx-gateway" "edge" "OFFLINE"
  fi

  # Primary and Secondary
  for entry in "${SERVICES[@]}"; do
    IFS=: read -r name p_port s_port <<<"$entry"
    
    # Primary check
    if lsof -t -iTCP:"$p_port" -sTCP:LISTEN >/dev/null 2>&1; then
      printf '%-8s %-24s %-12s %s\n' "$p_port" "$name" "primary" "listening"
    else
      printf '%-8s %-24s %-12s %s\n' "$p_port" "$name" "primary" "OFFLINE"
    fi

    # Secondary check
    if lsof -t -iTCP:"$s_port" -sTCP:LISTEN >/dev/null 2>&1; then
      printf '%-8s %-24s %-12s %s\n' "$s_port" "$name" "replica-2" "listening"
    else
      printf '%-8s %-24s %-12s %s\n' "$s_port" "$name" "replica-2" "OFFLINE"
    fi
  done

  # gRPC ports
  for gport in 5005 5015; do
    role="primary"
    [[ "$gport" == "5015" ]] && role="replica-2"
    if lsof -t -iTCP:"$gport" -sTCP:LISTEN >/dev/null 2>&1; then
      printf '%-8s %-24s %-12s %s\n' "$gport" "chat-service-grpc" "$role" "listening"
    else
      printf '%-8s %-24s %-12s %s\n' "$gport" "chat-service-grpc" "$role" "OFFLINE"
    fi
  done
  echo
}

# ------------------------------------------------------------------------------
# Handle Subcommands
# ------------------------------------------------------------------------------
case "${1:-start}" in
  stop)
    free_ports
    echo "✓ All Vero services and Nginx gateway stopped."
    exit 0
    ;;
  status)
    status
    exit 0
    ;;
  monitoring)
    command -v docker >/dev/null 2>&1 || { echo "❌ docker is required for monitoring but not found in PATH."; exit 1; }
    docker info >/dev/null 2>&1 || { echo "❌ Docker is not running. Start Docker Desktop, then re-run."; exit 1; }
    COMPOSE=(docker compose -f "$ROOT/infra/docker/monitoring.dev.yml")
    if [[ "${2:-up}" == "down" ]]; then
      "${COMPOSE[@]}" down
      echo "✓ Prometheus and Grafana stopped (their data volumes are kept)."
    else
      "${COMPOSE[@]}" up -d
      echo
      echo "  Grafana:     http://localhost:3001   (view without signing in; admin / admin to edit)"
      echo "  Prometheus:  http://localhost:9090   (Status → Targets shows what it can reach)"
      echo "  Stop:        ./scripts/dev-stack.sh monitoring down"
    fi
    exit 0
    ;;
esac

# ------------------------------------------------------------------------------
# Prerequisite Checks
# ------------------------------------------------------------------------------
command -v bun >/dev/null 2>&1 || { echo "❌ bun is required but not found in PATH."; exit 1; }
command -v nginx >/dev/null 2>&1 || { echo "❌ nginx is required but not found in PATH."; exit 1; }

# Locate zrok2 or zrok binary
ZROK_BIN=""
if command -v zrok2 >/dev/null 2>&1; then
  ZROK_BIN="zrok2"
elif command -v zrok >/dev/null 2>&1; then
  ZROK_BIN="zrok"
fi

# ------------------------------------------------------------------------------
# [Step 1] Build the web/apps
# ------------------------------------------------------------------------------
echo "→ [Step 1] Building production web SPA (dist/)…"
mkdir -p "$LOG_DIR"

if [[ -d "$ROOT/packages/shared" ]]; then
  echo "   Building @repo/shared…"
  ( cd "$ROOT/packages/shared" && bun run build >"$LOG_DIR/shared-build.log" 2>&1 ) || echo "⚠️  @repo/shared build had warnings (see $LOG_DIR/shared-build.log)"
fi

echo "   Building apps/web with bun run build…"
if ( cd "$ROOT/apps/web" && bun run build >"$LOG_DIR/web-build.log" 2>&1 ); then
  echo "✓ apps/web built successfully (code/apps/web/dist generated)."
else
  echo "❌ apps/web build failed! Check $LOG_DIR/web-build.log"
  tail -n 20 "$LOG_DIR/web-build.log"
  exit 1
fi

# ------------------------------------------------------------------------------
# [Step 2] Release Ports
# ------------------------------------------------------------------------------
free_ports

# ------------------------------------------------------------------------------
# [Step 3] Start All Services (Primary + Secondary) & Nginx Gateway
# ------------------------------------------------------------------------------
echo "→ [Step 3] Starting microservice clusters on designated ports…"

# Start Primary Instances (8001 - 8007)
for entry in "${SERVICES[@]}"; do
  IFS=: read -r name p_port _ <<<"$entry"
  case "$name" in
    chat-service)
      ( cd "$ROOT/services/$name" && PORT="$p_port" GRPC_PORT=5005 nohup bun dev >"$LOG_DIR/$name.log" 2>&1 & )
      ;;
    meet-service)
      ( cd "$ROOT/services/$name" && PORT="$p_port" MEDIASOUP_MIN_PORT=40000 MEDIASOUP_MAX_PORT=44999 nohup bun dev >"$LOG_DIR/$name.log" 2>&1 & )
      ;;
    *)
      ( cd "$ROOT/services/$name" && PORT="$p_port" nohup bun dev >"$LOG_DIR/$name.log" 2>&1 & )
      ;;
  esac
  echo "   [Primary]   $name → :$p_port"
done

# Start Secondary Replicas (8011 - 8017)
for entry in "${SERVICES[@]}"; do
  IFS=: read -r name _ s_port <<<"$entry"
  case "$name" in
    chat-service)
      ( cd "$ROOT/services/$name" && PORT="$s_port" GRPC_PORT=5015 nohup bun dev >"$LOG_DIR/$name-2.log" 2>&1 & )
      ;;
    meet-service)
      ( cd "$ROOT/services/$name" && PORT="$s_port" MEDIASOUP_MIN_PORT=45000 MEDIASOUP_MAX_PORT=49999 nohup bun dev >"$LOG_DIR/$name-2.log" 2>&1 & )
      ;;
    *)
      ( cd "$ROOT/services/$name" && PORT="$s_port" nohup bun dev >"$LOG_DIR/$name-2.log" 2>&1 & )
      ;;
  esac
  echo "   [Replica-2] $name → :$s_port"
done

# Start background AI worker
if [[ -d "$ROOT/ai-worker" ]]; then
  echo "   [Worker]    ai-worker (background job processor)"
  ( cd "$ROOT/ai-worker" && nohup bun dev >"$LOG_DIR/ai-worker.log" 2>&1 & )
fi

# Start Nginx Gateway on port 3000
echo "   [Gateway]   Nginx reverse proxy on :$GATEWAY_PORT (serving apps/web/dist)"
mkdir -p "$ROOT/infra/nginx/temp"
nginx -p "$ROOT/infra/nginx" -c nginx.conf

# Wait for primary and secondary instances to report healthy
echo "→ Waiting for health checks on all clusters…"
HTTP_PORTS=(8001 8002 8003 8004 8005 8006 8007 8011 8012 8013 8014 8015 8016 8017)
for _ in {1..30}; do
  ready=0
  for port in "${HTTP_PORTS[@]}"; do
    curl -sf -m 1 "http://localhost:$port/health" >/dev/null 2>&1 && ready=$((ready + 1))
  done
  [[ $ready -ge 14 ]] && break
  sleep 1
done

echo
status

echo "===================================================================="
echo "  🚀 Vero Clustered Gateway Active"
echo "===================================================================="
echo "  Local Edge Gateway:  http://localhost:3000"
echo "  Target Public URL:   https://vero-spl2.shares.zrok.io"
echo "  Google OAuth URL:    https://vero-spl2.shares.zrok.io/api/better-auth/callback/google"
echo "  Service Instances:   14 active replicas load-balanced via Nginx"
echo "  Logs:                $LOG_DIR/*.log"
echo "  Metrics dashboard:   ./scripts/dev-stack.sh monitoring  →  http://localhost:3001"
echo "  Stop command:        ./scripts/dev-stack.sh stop"
echo "===================================================================="
echo

# If user specified --no-tunnel, stop here without launching zrok
if [[ "${1:-}" == "--no-tunnel" || "${2:-}" == "--no-tunnel" ]]; then
  echo "ℹ️  --no-tunnel specified; cluster is running in the background."
  exit 0
fi

# ------------------------------------------------------------------------------
# [Step 4] Validate zrok2 installation & configuration
# ------------------------------------------------------------------------------
echo "→ [Step 4] Validating zrok2 installation & account environment…"

if [[ -z "$ZROK_BIN" ]]; then
  echo "❌ zrok2 (or zrok) is not installed on this system."
  echo "   To install zrok2:"
  echo "     curl -sSLf https://get.zrok.io | bash"
  echo "   Once installed, enable your zrok account:"
  echo "     zrok2 invite"
  echo "     zrok2 enable <your-account-token>"
  echo "   Then re-run this script."
  exit 1
fi

if ! "$ZROK_BIN" status >/dev/null 2>&1; then
  echo "❌ $ZROK_BIN is installed, but no enabled environment was found."
  echo "   Please log in and set up $ZROK_BIN before continuing:"
  echo "     1. Grab your account token from https://zrok.io"
  echo "     2. Run: $ZROK_BIN enable <your-token>"
  echo "   Then re-run this script."
  exit 1
fi

echo "✓ $ZROK_BIN detected and active account environment confirmed."

# ------------------------------------------------------------------------------
# [Step 5] Tunnel with zrok2
# ------------------------------------------------------------------------------
echo "→ [Step 5] Launching public tunnel:"
echo "   $ZROK_BIN share public http://localhost:3000 -n public:vero-spl2"
echo
echo "   Target domain: https://vero-spl2.shares.zrok.io/"
echo "   (Press Ctrl+C to stop tunnel and shut down all background cluster services)"
echo

# Trap Ctrl+C (SIGINT/SIGTERM) to clean up all services on exit
cleanup() {
  echo -e "\n→ Signal received: shutting down Vero cluster…"
  free_ports
  echo "✓ Everything stopped cleanly."
  exit 0
}
trap cleanup INT TERM

# Run zrok2 share public
if [[ -t 1 ]]; then
  "$ZROK_BIN" share public http://localhost:3000 -n public:vero-spl2
else
  "$ZROK_BIN" share public http://localhost:3000 -n public:vero-spl2 --headless
fi
