#!/usr/bin/env bash
#
# ==============================================================================
# Vero Multi-Instance Clustered Stack Runner (Local, LAN, Tailnet, or Public)
# ==============================================================================
#
# Flags (can be combined in any order):
#   --tunnel        Expose publicly via zrok2 tunnel (https://vero-spl2.shares.zrok.io)
#   --tailnet       Expose to Tailscale private mesh via MagicDNS & TLS (https://<node>.ts.net)
#   --lan           Expose to local Wi-Fi / Hotspot LAN subnet (http://<lan-ip>:3000)
#   --bg            Run the cluster detached in background
#   (no flags)      Start strictly on localhost (http://localhost:3000, zero tunnels)
#
# Subcommands:
#   ./scripts/dev-stack.sh stop            Terminate all cluster processes, Nginx, and tunnels
#   ./scripts/dev-stack.sh status          Display real-time listener status for all ports
#   ./scripts/dev-stack.sh restart         Free all ports and re-launch the cluster
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

ALL_PORTS=("$GATEWAY_PORT" "${PRIMARY_PORTS[@]}" "${SECONDARY_PORTS[@]}")

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
# Argument Parsing
# ------------------------------------------------------------------------------
MODE_TUNNEL=false
MODE_TAILNET=false
MODE_LAN=false
MODE_BG=false
COMMAND="start"

for arg in "$@"; do
  case "$arg" in
    stop)
      COMMAND="stop"
      ;;
    status)
      COMMAND="status"
      ;;
    restart)
      COMMAND="restart"
      ;;
    --tunnel)
      MODE_TUNNEL=true
      ;;
    --tailnet)
      MODE_TAILNET=true
      ;;
    --lan)
      MODE_LAN=true
      ;;
    --bg|-d)
      MODE_BG=true
      ;;
    --no-tunnel)
      MODE_TUNNEL=false
      ;;
    --help|-h)
      echo "Vero Development Stack Runner"
      echo
      echo "Usage:"
      echo "  ./scripts/dev-stack.sh                              Run strictly locally on http://localhost:3000"
      echo "  ./scripts/dev-stack.sh --tailnet                    Expose via Tailscale MagicDNS (https://<node>.ts.net)"
      echo "  ./scripts/dev-stack.sh --lan                        Expose to local Wi-Fi / Hotspot (http://<lan-ip>:3000)"
      echo "  ./scripts/dev-stack.sh --tunnel                     Expose publicly via zrok2 tunnel"
      echo "  ./scripts/dev-stack.sh --tailnet --lan --tunnel     Combine all network endpoints simultaneously"
      echo "  ./scripts/dev-stack.sh --bg                         Detach and run services in background"
      echo "  ./scripts/dev-stack.sh stop                         Terminate all cluster processes, Nginx, and tunnels"
      echo "  ./scripts/dev-stack.sh status                       Display port listener and replica health status"
      echo "  ./scripts/dev-stack.sh restart                      Restart all services and edge proxy"
      echo
      exit 0
      ;;
    *)
      # Ignore or unknown flags
      ;;
  esac
done

# ------------------------------------------------------------------------------
# Process cleanup & Port Release
# ------------------------------------------------------------------------------
free_ports() {
  echo "→ Releasing all Vero ports, Nginx gateway, and active tunnels…"

  # Reset Tailscale serve if active
  if command -v tailscale >/dev/null 2>&1; then
    tailscale serve reset >/dev/null 2>&1 || sudo -n tailscale serve reset >/dev/null 2>&1 || true
  fi

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
# Subcommand Execution
# ------------------------------------------------------------------------------
case "$COMMAND" in
  stop)
    free_ports
    echo "✓ All Vero services, Nginx gateway, and active tunnels stopped."
    exit 0
    ;;
  status)
    status
    exit 0
    ;;
  restart)
    free_ports
    sleep 1
    ;;
  start)
    ;;
esac

# ------------------------------------------------------------------------------
# Prerequisite Checks
# ------------------------------------------------------------------------------
command -v bun >/dev/null 2>&1 || { echo "❌ bun is required but not found in PATH."; exit 1; }
command -v nginx >/dev/null 2>&1 || { echo "❌ nginx is required but not found in PATH."; exit 1; }

ZROK_BIN=""
if [[ "$MODE_TUNNEL" == "true" ]]; then
  if command -v zrok2 >/dev/null 2>&1; then
    ZROK_BIN="zrok2"
  elif command -v zrok >/dev/null 2>&1; then
    ZROK_BIN="zrok"
  else
    echo "❌ zrok2 (or zrok) is not installed on this system."
    echo "   To install zrok2:"
    echo "     curl -sSLf https://get.zrok.io | bash"
    echo "   Once installed, enable your zrok account:"
    echo "     zrok2 enable <your-account-token>"
    exit 1
  fi

  if ! "$ZROK_BIN" status >/dev/null 2>&1; then
    echo "❌ $ZROK_BIN is installed, but no enabled environment was found."
    echo "   Run: $ZROK_BIN enable <your-token>"
    exit 1
  fi
fi

# Detect Local LAN IP (Wi-Fi or Hotspot interface)
LAN_IP=""
if [[ "$MODE_LAN" == "true" ]]; then
  LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{print $7}' | head -n 1)"
  [[ -z "$LAN_IP" ]] && LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi

# Detect Tailscale Domain and Tailscale IP
TS_DOMAIN=""
TS_IP=""
if [[ "$MODE_TAILNET" == "true" ]]; then
  if ! command -v tailscale >/dev/null 2>&1; then
    echo "❌ tailscale CLI is not installed or not in PATH."
    exit 1
  fi
  TS_STATUS="$(tailscale status --json 2>/dev/null || true)"
  if [[ -n "$TS_STATUS" ]]; then
    DETECTED_DOMAIN="$(echo "$TS_STATUS" | grep -o '"DNSName": *"[^"]*"' | head -n 1 | cut -d'"' -f4 | sed 's/\.$//')"
    [[ -n "$DETECTED_DOMAIN" ]] && TS_DOMAIN="$DETECTED_DOMAIN"
    DETECTED_IP="$(tailscale ip -4 2>/dev/null | head -n 1)"
    [[ -n "$DETECTED_IP" ]] && TS_IP="$DETECTED_IP"
  fi
  if [[ -z "$TS_DOMAIN" ]]; then
    TS_DOMAIN="nafis-elitebook.tailbbd834.ts.net"
  fi
fi

# ------------------------------------------------------------------------------
# Build Trusted Client Origins & BetterAuth Base URL
# ------------------------------------------------------------------------------
CLIENT_URL_LIST=("http://localhost:3000")

if [[ "$MODE_LAN" == "true" && -n "$LAN_IP" ]]; then
  CLIENT_URL_LIST+=("http://$LAN_IP:3000")
fi

if [[ "$MODE_TAILNET" == "true" ]]; then
  [[ -n "$TS_DOMAIN" ]] && CLIENT_URL_LIST+=("https://$TS_DOMAIN")
  [[ -n "$TS_IP" ]] && CLIENT_URL_LIST+=("http://$TS_IP:3000")
fi

if [[ "$MODE_TUNNEL" == "true" ]]; then
  CLIENT_URL_LIST+=("https://vero-spl2.shares.zrok.io")
fi

# Comma-separated list for BetterAuth trustedOrigins
CLIENT_URLS=$(IFS=, ; echo "${CLIENT_URL_LIST[*]}")

# Determine primary OAuth Redirect Base URL (prefers valid HTTPS endpoints)
if [[ "$MODE_TAILNET" == "true" && -n "$TS_DOMAIN" ]]; then
  AUTH_BASE_URL="https://$TS_DOMAIN/api/better-auth"
elif [[ "$MODE_TUNNEL" == "true" ]]; then
  AUTH_BASE_URL="https://vero-spl2.shares.zrok.io/api/better-auth"
elif [[ "$MODE_LAN" == "true" && -n "$LAN_IP" ]]; then
  AUTH_BASE_URL="http://$LAN_IP:3000/api/better-auth"
else
  AUTH_BASE_URL="http://localhost:3000/api/better-auth"
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
    auth-service)
      ( cd "$ROOT/services/$name" && PORT="$p_port" BETTER_AUTH_URL="$AUTH_BASE_URL" CLIENT_URL="$CLIENT_URLS" nohup bun dev >"$LOG_DIR/$name.log" 2>&1 & )
      ;;
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
    auth-service)
      ( cd "$ROOT/services/$name" && PORT="$s_port" BETTER_AUTH_URL="$AUTH_BASE_URL" CLIENT_URL="$CLIENT_URLS" nohup bun dev >"$LOG_DIR/$name-2.log" 2>&1 & )
      ;;
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
echo "  🚀 Vero Clustered Stack Active"
echo "===================================================================="
echo "  Local Edge Gateway:  http://localhost:3000"

if [[ "$MODE_TAILNET" == "true" ]]; then
  echo "  Tailnet HTTPS:       https://$TS_DOMAIN"
  [[ -n "$TS_IP" ]] && echo "  Tailnet Direct IP:   http://$TS_IP:3000"
fi

if [[ "$MODE_LAN" == "true" && -n "$LAN_IP" ]]; then
  echo "  Local LAN (Wi-Fi):   http://$LAN_IP:3000"
fi

if [[ "$MODE_TUNNEL" == "true" ]]; then
  echo "  Public zrok2 Tunnel: https://vero-spl2.shares.zrok.io"
fi

if [[ "$MODE_TAILNET" == "false" && "$MODE_LAN" == "false" && "$MODE_TUNNEL" == "false" ]]; then
  echo "  Mode:                Localhost only (zero public tunnels, zero latency)"
fi

echo "  Google OAuth Return: $AUTH_BASE_URL/callback/google"
echo "  Trusted Origins:     $CLIENT_URLS"
echo "  Service Instances:   14 active replicas load-balanced via Nginx"
echo "  Logs:                $LOG_DIR/*.log"
echo "  Stop command:        ./scripts/dev-stack.sh stop"
echo "===================================================================="
echo

# ------------------------------------------------------------------------------
# [Step 4] Tailscale Serve Activation (if --tailnet)
# ------------------------------------------------------------------------------
if [[ "$MODE_TAILNET" == "true" ]]; then
  echo "→ [Step 4] Activating Tailscale HTTPS serve (https://$TS_DOMAIN -> :3000)…"
  
  SERVE_OUT="$(tailscale serve --yes --bg 3000 2>&1 || true)"

  # If access was denied due to missing operator permissions, attempt sudo
  if [[ "$SERVE_OUT" == *"Access denied"* || "$SERVE_OUT" == *"require root"* ]]; then
    if sudo -n true 2>/dev/null; then
      # Passwordless or cached sudo available
      sudo tailscale serve --yes --bg 3000 >/dev/null 2>&1 || true
    elif [[ -t 0 ]]; then
      # Interactive terminal: prompt for sudo once
      echo "   Tailscale requires operator permission. Running with sudo…"
      sudo tailscale serve --yes --bg 3000 || true
    fi
  fi

  if tailscale serve status 2>&1 | grep -q -i "https://"; then
    echo "✓ Tailscale HTTPS serve active at: https://$TS_DOMAIN"
  else
    echo "⚠️  Tailscale HTTPS serve could not start automatically:"
    echo "$SERVE_OUT" | sed 's/^/   /'
    echo
    echo "   👉 Fix (run once in terminal to permit non-root Tailscale commands):"
    echo "      sudo tailscale set --operator=\$USER"
    echo "   Then re-run: ./scripts/dev-stack.sh --tailnet"
  fi
  echo
fi

# ------------------------------------------------------------------------------
# Detached Background Mode (--bg)
# ------------------------------------------------------------------------------
if [[ "$MODE_BG" == "true" ]]; then
  echo "✓ Stack is running detached in the background."
  echo "  Run './scripts/dev-stack.sh stop' to terminate."
  exit 0
fi

# ------------------------------------------------------------------------------
# [Step 5] Tunneling / Foreground Hold
# ------------------------------------------------------------------------------
cleanup() {
  echo -e "\n→ Signal received: shutting down Vero cluster…"
  free_ports
  echo "✓ Everything stopped cleanly."
  exit 0
}
trap cleanup INT TERM

if [[ "$MODE_TUNNEL" == "true" ]]; then
  echo "→ [Step 5] Launching public zrok2 tunnel:"
  echo "   $ZROK_BIN share public http://localhost:3000 -n public:vero-spl2"
  echo
  echo "   Target domain: https://vero-spl2.shares.zrok.io/"
  echo "   (Press Ctrl+C to stop tunnel and shut down all background cluster services)"
  echo

  if [[ -t 1 ]]; then
    "$ZROK_BIN" share public http://localhost:3000 -n public:vero-spl2
  else
    "$ZROK_BIN" share public http://localhost:3000 -n public:vero-spl2 --headless
  fi
else
  echo "💡 Stack is running. Press Ctrl+C to stop all services (or run './scripts/dev-stack.sh stop' in another terminal)."
  while true; do
    sleep 3600 &
    wait $! 2>/dev/null || true
  done
fi
