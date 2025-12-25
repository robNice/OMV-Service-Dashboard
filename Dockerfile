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

COPY LICENSE /LICENSE
COPY README.md /README.md
COPY CONFIG_README.md /CONFIG_README.md


COPY app/package.json app/package-lock.json ./

RUN npm ci --omit=dev

COPY app/ .

CMD ["node", "server.js"]
