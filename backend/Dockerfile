FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Development
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["bun", "run", "dev"]

# Production build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun build src/index.ts --target=bun --outdir=./dist

# Production
FROM base AS production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
ENV NODE_ENV=production
EXPOSE 3001
CMD ["bun", "run", "dist/index.js"]
