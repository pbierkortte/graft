FROM node:22-slim AS builder

WORKDIR /graft
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

FROM node:22-slim AS runtime

RUN apt-get update \
 && apt-get install -y --no-install-recommends git curl jq bash \
 && rm -rf /var/lib/apt/lists/* \
 && git config --global user.email "graft@dev" \
 && git config --global user.name "graft"

WORKDIR /graft
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /graft/dist/ dist/

CMD ["node", "dist/index.js"]
