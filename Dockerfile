# Multi-stage Dockerfile for Finances OSS application
# Based on the NixOS configuration.nix

# Stage 1: Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Install system dependencies needed for building
RUN apt-get update && apt-get install -y \
    openssl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN ["bun", "install", "--frozen-lockfile"]

# Copy application source
COPY . .

# Generate Prisma client
RUN ["bunx", "prisma", "generate", "--schema", "prisma/schema.prisma"]

# Build the application
RUN ["bun", "run", "build"]

# Stage 2: Runtime stage
FROM oven/bun:1-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    chromium-headless-shell \
    openssl \
    sqlite3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create directories for state and cache
RUN mkdir -p /var/lib/finances /var/cache/finances

# Copy built application from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src/lib/server/prisma/libquery_engine*.node /tmp/prisma-engines/

# Set environment variables (can be overridden at runtime)
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/var/lib/finances/db.sqlite
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV FILES_DIR=/var/cache/finances
ENV BUN_INSTALL_CACHE_DIR=/var/cache/finances/bun-install
ENV BUN_RUNTIME_CACHE_DIR=/var/cache/finances/bun-runtime
ENV TMPDIR=/tmp
ENV XDG_CACHE_HOME=/var/cache/finances

# Expose port
EXPOSE 3000

# Use a non-root user for security
RUN useradd -M finances && \
    chown -R finances:finances /app /var/lib/finances /var/cache/finances

USER finances

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD bunx prisma migrate deploy --schema /app/prisma/schema.prisma && bun /app/build/index.js
