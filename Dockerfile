ARG BASE_IMAGE=node:22-alpine
FROM ${BASE_IMAGE}

COPY . /app
WORKDIR /app

RUN npm install

ENTRYPOINT [ "node", "index.js" ]
