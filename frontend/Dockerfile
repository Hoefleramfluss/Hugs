FROM node:20-bullseye-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --include-workspace-root --workspace=frontend

FROM node:20-bullseye-slim AS builder
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY --from=deps /app/frontend/package.json ./frontend/package.json
COPY --from=deps /app/backend/package.json ./backend/package.json
COPY . .
RUN npm run build --workspace=frontend

FROM node:20-bullseye-slim AS runner
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public
EXPOSE 8080
WORKDIR /app/frontend
CMD ["node", "server.js"]
