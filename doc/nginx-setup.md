# 🚀 Vero Nginx & SSL Quickstart Guide (LAN & Mobile Testing)

This guide helps teammates set up Nginx reverse proxy with HTTPS, WebSockets, and `nip.io` domain for mobile/cross-device testing.

---

## 1. Find your Local IP Address

Run:
```bash
hostname -I | awk '{print $1}'
# Example output: 192.168.68.105
```

Your app will be accessible at:
```
https://<YOUR-LOCAL-IP>.nip.io:8443
```
*(Example: `https://192.168.68.105.nip.io:8443`)*

---

## 2. Generate Self-Signed Certificates

Create the certs directory inside Nginx if it doesn't exist:
```bash
sudo mkdir -p /etc/nginx/certs
```

Generate self-signed certificate for your local IP and `.nip.io` domain:
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/certs/nginx-selfsigned.key \
  -out /etc/nginx/certs/nginx-selfsigned.crt \
  -subj "/CN=*.nip.io"
```

---

## 3. Install the Nginx Site Config

Copy the repository Nginx configuration into your system's `sites-available`:

```bash
sudo cp code/infra/nginx/nginx.conf /etc/nginx/sites-available/vero
```

Enable the site by linking it to `sites-enabled`:
```bash
sudo ln -sf /etc/nginx/sites-available/vero /etc/nginx/sites-enabled/vero
```

---

## 4. Test and Reload Nginx

Verify configuration syntax and reload:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 5. WebSockets & Real-Time Services Overview

The Nginx configuration proxies all microservices and automatically handles WebSocket upgrades (`Upgrade: $http_upgrade` & `Connection: Upgrade`):

| Endpoint | Target Service | Port | WebSockets / Protocol |
|---|---|---|---|
| `/` | Frontend (Vite) | `3000` | Vite HMR |
| `/api/auth/` | Auth Service | `8001` | HTTP |
| `/api/better-auth/` | BetterAuth | `8001` | HTTP |
| `/api/board/` | Board Service | `8002` | HTTP |
| `/api/notes/` | Notes Service | `8003` | **Yjs Collaboration WebSockets** |
| `/api/project/` | Project Service | `8004` | HTTP |
| `/api/chat/` | Chat Service | `8005` | **Socket.io WebSockets** |
| `/api/notifications/` | Notification Service | `8006` | **Socket.io WebSockets** |
| `/api/meet/` | Meet Service | `8007` | **WebRTC SFU + Socket.io** |

---

## 6. Accessing from Mobile or Teammate's Laptop

1. Connect your phone or laptop to the **same Wi-Fi / Local Network**.
2. Open Chrome/Firefox/Safari on mobile.
3. Visit `https://<YOUR-LOCAL-IP>.nip.io:8443`.
4. Accept the self-signed certificate warning on first load.
5. All features (Video calls, collaborative notes, real-time chat) work smoothly over HTTPS!
