FROM oven/bun:1 AS base
WORKDIR /app

# Build frontend
FROM base AS frontend-builder
COPY shared/package.json ./shared/
RUN cd shared && bun install
COPY frontend/package.json frontend/bun.lockb* ./frontend/
RUN cd frontend && bun install
COPY frontend ./frontend
COPY shared ./shared
RUN cd frontend && bun run build

# Final image — backend serves the built frontend as static files
FROM base
COPY backend/package.json backend/bun.lockb* ./
RUN bun install
COPY backend/src ./backend/src
COPY backend/scripts ./backend/scripts
COPY shared ./shared
COPY --from=frontend-builder /app/frontend/dist ./public

CMD ["sh", "-c", "bun backend/scripts/migrate.ts && bun backend/scripts/seed.ts && bun backend/src/local.ts"]
