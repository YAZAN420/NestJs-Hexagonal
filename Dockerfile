FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "node dist/main.js || sleep 60"]