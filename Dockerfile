FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl jq bash \
 && rm -rf /var/lib/apt/lists/* \
 && git config --global user.email "graft@dev" \
 && git config --global user.name "graft"

WORKDIR /graft
COPY package.json package-lock.json ./
RUN npm ci --production=false
COPY tsconfig.json agent.md ./
COPY src/ src/
RUN npm run build

CMD ["node", "dist/index.js"]
