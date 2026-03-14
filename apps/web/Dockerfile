# Build from repo root: docker build -f apps/web/Dockerfile .
FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install

WORKDIR /app/apps/web

# 빌드 시점에 API 주소 박힘. 배포 시 --build-arg NEXT_PUBLIC_API_BASE_URL=http://API서버IP:8000
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
