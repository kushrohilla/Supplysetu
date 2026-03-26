FROM node:22.13.0-slim AS builder

WORKDIR /app

# Copy workspace manifests first so dependency install can be cached.
COPY package.json package-lock.json ./
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY apps/admin-web/package.json ./apps/admin-web/package.json

RUN npm ci

# Copy only the backend runtime source and shared packages needed to build.
COPY tsconfig.json knexfile.ts ./
COPY apps/backend ./apps/backend
COPY packages ./packages

RUN npm run build

FROM node:22.13.0-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY apps/admin-web/package.json ./apps/admin-web/package.json

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["npm", "start"]
