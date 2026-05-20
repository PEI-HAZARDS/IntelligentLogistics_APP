# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Enable pnpm via corepack (version pinned in package.json "packageManager").
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_MODE=gate
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_GRAFANA_URL
ARG VITE_PORT_NAME
ARG VITE_SUBTITLE
ARG VITE_LOGO_PATH
ARG VITE_SUPPORT_EMAIL

ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_GRAFANA_URL=$VITE_GRAFANA_URL \
    VITE_PORT_NAME=$VITE_PORT_NAME \
    VITE_SUBTITLE=$VITE_SUBTITLE \
    VITE_LOGO_PATH=$VITE_LOGO_PATH \
    VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL

RUN pnpm run build --mode "$VITE_MODE"

# --- Serve stage ---
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
