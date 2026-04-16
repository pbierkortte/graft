FROM node:24-slim AS builder

WORKDIR /graft
COPY package.json ./
RUN npm install
COPY src/ src/
RUN npm run build

FROM node:24-slim AS runtime

RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl jq bash \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /graft
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /graft/dist/ dist/

RUN chown -R node:node /graft

USER node

RUN git config --global user.email "graft@dev" \
 && git config --global user.name "graft"

CMD ["node", "dist/index.js"]
