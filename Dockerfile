FROM node:24-alpine AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN npm ci

FROM dependencies AS builder

COPY . .
ENV NODE_ENV=production
ENV DATABASE_URL=mysql://build:build@127.0.0.1:3306/build
ENV DATABASE_HOST=127.0.0.1
ENV DATABASE_PORT=3306
ENV DATABASE_USER=build
ENV DATABASE_PASSWORD=build
ENV DATABASE_NAME=build
ENV JWT_SECRET=build-only-secret-that-is-never-used-at-runtime
RUN npm run build

FROM builder AS tools

CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000').then((response) => process.exit(response.status < 500 ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
