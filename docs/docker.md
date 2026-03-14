# Docker · 로컬/배포 동일 접속

로컬과 배포에서 **같은 서비스명(`db`, `redis`)으로 접속**하도록 맞춰 두었습니다. 로컬에서도 compose로 띄우면 배포와 동일한 연결로 동작하는지 확인할 수 있습니다.

## 서비스 접속 (공통)

- **DB**: `postgresql://tryl:tryl@db:5432/tryl`
- **Redis**: `redis://redis:6379/0`

`docker-compose.yml`과 `docker-compose.prod.yml` 모두 위와 같은 `db` / `redis` 호스트를 사용합니다.

## 로컬 실행

```bash
# api/worker/web 각 앱 디렉터리에 .env 준비 (없으면 .env.example 복사 후 사용)
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env

# 루트에서
docker compose up --build
```

- API: http://localhost:8000  
- Web: http://localhost:3000  
- DB: localhost:5432, Redis: localhost:6379 (호스트에서 접속 시)

## 배포 실행

- `docker-compose.prod.yml` 사용 시 각 앱의 `.env.production`을 사용합니다.
- 서비스 구조와 `db`/`redis` 접속 방식은 로컬과 동일합니다.

## 호스트에서만 API/Worker 실행 시

DB/Redis를 호스트에서 띄우거나, 포트만 매핑해서 쓰는 경우에는 `.env`에서만 다음처럼 바꿔서 사용하면 됩니다.

- `DATABASE_URL=postgresql://tryl:tryl@localhost:5432/tryl`
- `REDIS_URL=redis://localhost:6379/0`

## Web 이미지 빌드

Web 앱 Dockerfile은 **모노레포 루트를 빌드 컨텍스트**로 사용합니다.

- `docker-compose.yml` / `docker-compose.prod.yml` 모두  
  `context: .`, `dockerfile: apps/web/Dockerfile` 로 빌드합니다.
- 루트에서 직접 빌드:  
  `docker build -f apps/web/Dockerfile .`

**요청 URL을 API 서버 IP로 쓰려면** (sign-up 등이 localhost가 아닌 IP로 나가게 하려면):  
웹 **빌드 시점**에 `NEXT_PUBLIC_API_BASE_URL`을 넣어야 합니다.  
예: `NEXT_PUBLIC_API_BASE_URL=http://API서버IP:8000` 을 루트 `.env` 또는 환경에 두고  
`docker compose build web` 하거나,  
`docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_BASE_URL=http://54.12.34.56:8000 .` 로 빌드합니다.
