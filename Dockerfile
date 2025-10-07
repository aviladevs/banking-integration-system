# Backend Node + TypeScript com SQLite

FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
COPY public ./public
RUN npm run build

FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY public ./public

# Render define PORT automaticamente
EXPOSE 3000

CMD ["node", "dist/index.js"]
