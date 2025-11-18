FROM node:18-alpine

# Install docker CLI (für docker ps im Container)
RUN apk add --no-cache docker-cli

FROM node:20-alpine
RUN apk add --no-cache \
    coreutils util-linux procps lm_sensors smartmontools


WORKDIR /app

COPY app/package.json .
RUN npm install

COPY app/ .

CMD ["node", "server.js"]
