# syntax=docker/dockerfile:1

# ---- Build stage: compile the frontend and the backend ----
FROM node:24-bookworm AS build
WORKDIR /app

# Install all deps (incl. dev) for the build toolchain.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The frontend and the API are served from the same origin/port in the
# container, so the client uses same-origin relative requests.
ENV VITE_API_BASE_URL=""

# Generate the OpenAPI contract + TS types, build the SPA, compile the backend,
# then place the built SPA where the backend serves it from.
RUN npm run generate-api-types \
 && npm run build \
 && npm run build:backend \
 && cp -r dist server/dist/public

# Drop dev dependencies so only the runtime deps are carried over.
RUN npm prune --omit=dev

# ---- Runtime stage: just Node + prod deps + build output ----
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist

# The app listens on $PORT (defaults to 4010) on 0.0.0.0 — see server/src/index.ts.
EXPOSE 4010
CMD ["node", "server/dist/index.js"]
