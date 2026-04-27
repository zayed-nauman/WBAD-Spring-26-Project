FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY . .
RUN npx prisma generate
RUN npm prune --production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .

EXPOSE 3000
CMD ["node", "src/server.js"]
