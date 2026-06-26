FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache wget docker-cli bash git jq curl

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY scripts /app/scripts


EXPOSE 3001

CMD ["node", "dist/index.js"]
