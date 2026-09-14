# Stage 1: Build Upstream Binary
FROM golang:1.24 AS upstream-builder
WORKDIR /src
# Pinned commit discovered from razorpay/razorpay-mcp-server main
RUN git clone https://github.com/razorpay/razorpay-mcp-server.git . && \
    git checkout 7950d51d118ca164c32b7cf0cfaa14f34f24849f
RUN GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o /out/razorpay-mcp-server ./cmd/razorpay-mcp-server

# Stage 2: Node Build & Native Dependencies
FROM node:20-alpine AS proxy-builder
WORKDIR /app
COPY package*.json ./
COPY packages/proxy/package*.json ./packages/proxy/
COPY packages/dashboard/package*.json ./packages/dashboard/
# Compile better-sqlite3 native bindings in Alpine
RUN apk add --no-cache python3 make g++ 
RUN npm ci
COPY . .
RUN npm run build -w packages/proxy
RUN npm run build -w packages/dashboard
# Re-install prod dependencies to trim dev footprint
RUN npm ci --omit=dev

# Stage 3: Runtime
FROM node:20-alpine
WORKDIR /app

# Copy the upstream binary
COPY --from=upstream-builder /out/razorpay-mcp-server /usr/local/bin/razorpay-mcp-server

# Copy production node_modules and built packages
COPY --from=proxy-builder /app/node_modules ./node_modules
COPY --from=proxy-builder /app/packages/proxy/node_modules ./packages/proxy/node_modules
COPY --from=proxy-builder /app/packages/proxy/dist ./packages/proxy/dist
COPY --from=proxy-builder /app/packages/proxy/package.json ./packages/proxy/package.json

# Copy static dashboard assets
COPY --from=proxy-builder /app/packages/dashboard/dist ./packages/dashboard/dist

# Need policy config and package root for structural refs if any
COPY config/policy.yaml ./policy.yaml
COPY packages/proxy/package.json ./packages/proxy/package.json

ENV STRUCTURA_UPSTREAM_CMD="razorpay-mcp-server"
ENV STRUCTURA_DASHBOARD_PATH="/app/packages/dashboard/dist"
ENV STRUCTURA_API_PORT="4000"
ENV STRUCTURA_DB_PATH="/data/structura.db"
ENV STRUCTURA_POLICY_PATH="/app/policy.yaml"

EXPOSE 4000

CMD ["node", "packages/proxy/dist/index.js"]
