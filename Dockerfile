ARG BASE_IMAGE=node:18
FROM ${BASE_IMAGE}

COPY . /app
WORKDIR /app

RUN npm install

ENTRYPOINT [ "node", "index.js" ]
