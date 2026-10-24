# The web app and the API gateway in one image: Vite builds the SPA, nginx
# serves it and routes /api to the service containers.
#
#   docker build -f infra/docker/web.Dockerfile .      (from code/)

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --filter "web..."
# The gateway serves the API on the same origin, so the relative path works
# whatever host the stack is reached on.
ENV VITE_API_URL=/api
RUN pnpm --filter "web..." run build

FROM nginx:1.27-alpine
COPY infra/nginx/vero-routes.conf /etc/nginx/vero-routes.conf
COPY infra/nginx/conf.d/vero.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/nginx-health || exit 1
