# Build context must be the workspace root (IntelligentLogistics_APP/) so that
# packages/shared is available and npm workspaces hoisting works correctly.
FROM node:20-alpine AS build
WORKDIR /workspace

# Copy workspace root manifests first (separate layer — cached while lockfile unchanged).
COPY package.json package-lock.json ./

# Copy sub-package manifests (needed so npm ci resolves workspace deps).
COPY packages/shared/package.json ./packages/shared/
COPY intelligent-logistics-frontend/package.json ./intelligent-logistics-frontend/

# Install all workspace deps from the root (hoists shared deps to /workspace/node_modules).
RUN npm ci --prefer-offline

# Copy shared package source (resolved by Vite alias: ../packages/shared/src).
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
ARG VITE_USE_SIMULATED_GRAPH

ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL \
    VITE_GRAFANA_URL=$VITE_GRAFANA_URL \
    VITE_PORT_NAME=$VITE_PORT_NAME \
    VITE_SUBTITLE=$VITE_SUBTITLE \
    VITE_LOGO_PATH=$VITE_LOGO_PATH \
    VITE_SUPPORT_EMAIL=$VITE_SUPPORT_EMAIL \
    VITE_USE_SIMULATED_GRAPH=$VITE_USE_SIMULATED_GRAPH

RUN npm run build:${VITE_MODE}

# --- Serve stage ---
FROM nginx:1.27-alpine
COPY --from=build /workspace/intelligent-logistics-frontend/dist /usr/share/nginx/html
# Template: the entrypoint runs envsubst (${API_UPSTREAM}) → /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/intelligent-logistics-frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 80
