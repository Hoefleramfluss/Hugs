FROM node:20-bullseye-slim AS builder
WORKDIR /app
ENV NODE_ENV=development
COPY package*.json ./
COPY prisma ./prisma
RUN npm install
COPY tsconfig.json tsconfig.json
COPY src ./src
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
