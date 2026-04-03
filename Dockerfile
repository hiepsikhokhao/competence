# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci
RUN npx prisma generate

# ─── Stage 2: Build the application ─────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# DATABASE_URL needed at build time for Prisma schema validation
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─── Stage 3: Production runner ─────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Standalone server + traced dependencies
COPY --from=builder /app/.next/standalone ./

# Static assets (not included in standalone automatically)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Prisma client runtime + CLI (needed for db push at startup)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/prisma ./prisma

# Init and entrypoint scripts
COPY --from=builder /app/scripts ./scripts
RUN chmod +x scripts/docker-entrypoint.sh

RUN chown -R nextjs:nodejs .next scripts

USER nextjs

EXPOSE 3012

ENV PORT=3012
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "scripts/docker-entrypoint.sh"]
