FROM node:18-alpine

# Install docker CLI (für docker ps im Container)
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY app/package.json .
RUN npm install

COPY app/ .

CMD ["node", "server.js"]
