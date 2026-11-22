# syntax=docker/dockerfile:1
# Build context is the repository root:  docker build -f apps/backend/Dockerfile .
# Debian (glibc) base is required: the Temporal worker ships native binaries that do not run on Alpine/musl.

FROM node:22-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci -w apps/backend
COPY apps/backend apps/backend
RUN npm run build -w apps/backend

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci -w apps/backend --omit=dev && npm cache clean --force
COPY --from=build /repo/apps/backend/dist apps/backend/dist
WORKDIR /repo/apps/backend
USER node
EXPOSE 4000
# API by default; the worker service overrides this with `node dist/worker.js`.
CMD ["node", "dist/server.js"]
