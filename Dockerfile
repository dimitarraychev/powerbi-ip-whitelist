# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Install ufw and iptables so both firewall backends are available
# (the host firewall is accessed via the shared network/privilege below)
RUN apk add --no-cache ufw iptables

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Non-root is ideal, but this service MUST run as root to call ufw/iptables
USER root

EXPOSE 3000

CMD ["node", "dist/index.js"]
