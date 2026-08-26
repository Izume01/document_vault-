# -------------------------------------------------------------
# Stage 1: Dependencies & Build
# -------------------------------------------------------------
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package.json bun.lock tsconfig.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma Client
RUN bun install --frozen-lockfile
RUN bunx prisma generate

# Copy source code
COPY src ./src

# -------------------------------------------------------------
# Stage 2: Production Runner
# -------------------------------------------------------------
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/src ./src

# Use non-root bun user for security
USER bun

EXPOSE 4000

CMD ["bun", "run", "src/index.ts"]
