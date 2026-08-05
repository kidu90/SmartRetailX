# Build stage
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

# Runtime stage
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache wget \
  && addgroup -S appgroup \
  && adduser -S appuser -G appgroup

COPY --from=build --chown=appuser:appgroup /app /app

USER appuser
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/index.js"]
