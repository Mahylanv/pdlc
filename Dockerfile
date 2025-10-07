# -------- Build stage --------
FROM node:20-alpine AS builder
WORKDIR /app

# 1) deps
COPY package*.json ./
RUN npm ci

# 2) sources
COPY . .

# 3) Prisma client (généré avant build)
RUN npx prisma generate

# 4) Build Next (assure-toi que "build" = "next build" sans --turbopack)
RUN npm run build

# -------- Run stage --------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 1) Copie l'output standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 2) Copie les binaires Prisma nécessaires au runtime
# (le standalone n'embarque pas toujours .prisma)
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma

EXPOSE 3000
CMD ["node", "server.js"]
