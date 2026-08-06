# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src

FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache wget \
  && addgroup -S appgroup \
  && adduser -S appuser -G appgroup
COPY --from=build --chown=appuser:appgroup /app /app
USER appuser
EXPOSE 3004
ENV NODE_ENV=production PORT=3004
HEALTHCHECK CMD wget -qO- http://127.0.0.1:3004/health || exit 1
CMD ["node", "src/index.js"]
