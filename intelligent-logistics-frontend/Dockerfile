# --- Build stage ---
# Build context must be the workspace root (IntelligentLogistics_APP/) so that
# packages/shared is available for the @il/shared Vite alias.
FROM node:20-alpine AS build
WORKDIR /workspace

# Enable pnpm via corepack (version pinned in package.json "packageManager").
RUN corepack enable

# Install frontend deps (separate layer — cached as long as lockfile doesn't change).
COPY intelligent-logistics-frontend/package.json intelligent-logistics-frontend/pnpm-lock.yaml ./intelligent-logistics-frontend/
RUN cd intelligent-logistics-frontend && pnpm install --frozen-lockfile

# Copy shared package (resolved by vite alias: ../packages/shared/src).
COPY packages/shared ./packages/shared

# Copy frontend source after deps to maximise cache hits.
COPY intelligent-logistics-frontend/ ./intelligent-logistics-frontend/

WORKDIR /workspace/intelligent-logistics-frontend

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
COPY --from=build /workspace/intelligent-logistics-frontend/dist /usr/share/nginx/html
COPY --from=build /workspace/intelligent-logistics-frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
