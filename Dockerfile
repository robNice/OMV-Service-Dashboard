FROM node:18-alpine

# Install docker CLI (für docker ps im Container)
RUN apk add --no-cache docker-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
    lm-sensors smartmontools coreutils util-linux procps \
 && rm -rf /var/lib/apt/lists/*


WORKDIR /app

COPY app/package.json .
RUN npm install

COPY app/ .

CMD ["node", "server.js"]
