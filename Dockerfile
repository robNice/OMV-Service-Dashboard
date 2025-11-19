FROM node:20-alpine

# Docker CLI installieren
RUN apk add --no-cache \
    docker-cli \
    coreutils \
    util-linux \
    procps \
    lm_sensors \
    smartmontools

WORKDIR /app

COPY app/package.json .
RUN npm install i18n --save

COPY app/ .

CMD ["node", "server.js"]
