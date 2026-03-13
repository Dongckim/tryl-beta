# Build from repo root: docker build -f apps/web/Dockerfile .
FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install

WORKDIR /app/apps/web

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
