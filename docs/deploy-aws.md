# AWS 배포 가이드 (EC2 + RDS)

도커 설정이 끝난 뒤, **RDS → API EC2 → Web EC2 → Worker EC2** 순서로 올리면 됩니다. Redis는 ElastiCache 권장(또는 API EC2에서 Redis 컨테이너 실행).

## 구성 개요

```
[인터넷]
    │
    ├── Web EC2 (Next.js, :3000)  ──► API EC2 (:8000)
    │
    ├── API EC2 (FastAPI, :8000)  ──► RDS (PostgreSQL)
    │                              ──► ElastiCache (Redis)
    │
    └── Worker EC2 (try-on worker) ──► RDS, Redis, S3
```

- **RDS**: PostgreSQL (DB)
- **ElastiCache**: Redis (작업 큐). 없으면 API EC2에서 Redis 컨테이너만 따로 실행해도 됨.
- **EC2 3대**: API 서버, Web 서버, Worker 서버 (각각 이미지 1개만 실행)

---

## 사전 준비

- AWS 계정, 리전 선택 (예: ap-northeast-2)
- EC2 키 페어 1개
- 도메인(선택): API용 `api.yourdomain.com`, Web용 `app.yourdomain.com`
- S3 버킷 + IAM 키 (이미지/결과 저장용)

---

## 1. RDS 설정

1. **RDS 콘솔** → Create database
   - Engine: **PostgreSQL 16**
   - Template: Dev/Test 또는 Production
   - DB identifier: `tryl-db`
   - Master username / password: 기억해 둘 비밀번호
   - Instance: 예) db.t3.micro
   - Storage: 20GB 이상
   - **VPC**: 나중에 API/Worker EC2와 같은 VPC 선택
   - Public access: No (같은 VPC 내부에서만 접속)
   - VPC security group: 새로 만들기 (예: `tryl-db-sg`)

2. **생성 후**
   - Endpoint 주소 복사 (예: `tryl-db.xxxxx.ap-northeast-2.rds.amazonaws.com`)
   - **Security group** 수정:
     - Inbound: PostgreSQL(5432), Source = API EC2용 SG, Worker EC2용 SG (또는 같은 VPC CIDR)

3. **DB 초기화** (로컬 또는 Bastion에서)
   - RDS가 **퍼블릭 액세스 없음**이면, 같은 VPC의 EC2(예: API EC2)에 잠깐 접속해서 아래 실행하거나, 로컬에서 VPN/터널로 접속.

   ```bash
   psql "postgresql://마스터유저:비밀번호@<RDS엔드포인트>:5432/postgres"
   ```

   ```sql
   CREATE DATABASE tryl;
   \c tryl
   -- apps/api/db/schema.sql 내용 실행
   -- 필요 시 migrations 도 실행
   ```

   `DATABASE_URL` 형식:
   ```text
   postgresql://마스터유저:비밀번호@<RDS엔드포인트>:5432/tryl
   ```

---

## 2. Redis (ElastiCache 권장)

### 옵션 A: ElastiCache

1. **ElastiCache** → Create Redis cluster
   - Engine: Redis 7
   - Cluster mode: Disabled
   - Node type: cache.t3.micro
   - **같은 VPC** 선택, API/Worker EC2와 같은 subnet 또는 통신 가능한 subnet
   - Security group: 새로 만들기 후, Inbound 6379 허용 (Source = API SG, Worker SG)

2. 생성 후 **Primary endpoint** 복사.
   - `REDIS_URL=redis://<primary-endpoint>:6379/0`

### 옵션 B: API EC2에서 Redis 컨테이너

API EC2에서 API와 함께 Redis만 먼저 실행:

```bash
docker run -d --name redis -p 6379:6379 redis:7
```

Worker EC2에서 접속하려면 **API EC2의 private IP**를 써야 하므로, 같은 VPC 내부에서만 가능.  
`REDIS_URL=redis://<API-EC2-private-IP>:6379/0`

---

## 3. 이미지 빌드 & 푸시 (한 번만)

로컬 또는 CI에서 이미지 빌드 후 ECR(또는 Docker Hub)에 푸시.

### ECR 예시

```bash
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin <계정ID>.dkr.ecr.ap-northeast-2.amazonaws.com

# 리포지터리 생성 (한 번만)
aws ecr create-repository --repository-name tryl-api --region ap-northeast-2
aws ecr create-repository --repository-name tryl-web --region ap-northeast-2
aws ecr create-repository --repository-name tryl-worker --region ap-northeast-2

# 빌드 (레포 루트에서)
docker build -f apps/api/Dockerfile -t tryl-api:latest ./apps/api
docker build -f apps/worker/Dockerfile -t tryl-worker:latest ./apps/worker
docker build -f apps/web/Dockerfile -t tryl-web:latest .

# 태그 & 푸시
ECR_URI=<계정ID>.dkr.ecr.ap-northeast-2.amazonaws.com
docker tag tryl-api:latest $ECR_URI/tryl-api:latest
docker tag tryl-web:latest $ECR_URI/tryl-web:latest
docker tag tryl-worker:latest $ECR_URI/tryl-worker:latest
docker push $ECR_URI/tryl-api:latest
docker push $ECR_URI/tryl-web:latest
docker push $ECR_URI/tryl-worker:latest
```

각 EC2에서는 이 이미지를 `docker pull`로 받아서 실행하면 됨.

---

## 4. API EC2 올리기

1. **EC2 인스턴스**
   - AMI: Amazon Linux 2023 또는 Ubuntu 22.04
   - 인스턴스: t3.small 등
   - **VPC/Subnet**: RDS, ElastiCache와 같은 VPC (또는 통신 가능한 subnet)
   - Security group (예: `tryl-api-sg`):
     - Inbound: 8000 (또는 80) from 0.0.0.0/0 (또는 ALB/Web만 제한)
     - Outbound: 5432(RDS SG), 6379(Redis SG), 443(HTTPS) 등

2. **접속 후 Docker 설치** (Amazon Linux 2023 예시)

   ```bash
   sudo yum update -y
   sudo yum install -y docker
   sudo systemctl enable docker && sudo systemctl start docker
   sudo usermod -aG docker ec2-user
   # 로그아웃 후 다시 SSH
   ```

3. **.env.production** 만들기 (API 전용)

   ```bash
   mkdir -p ~/tryl-api && cd ~/tryl-api
   nano .env.production
   ```

   내용 (RDS/Redis 실제 값으로 교체):

   ```env
   APP_ENV=production
   DATABASE_URL=postgresql://유저:비밀번호@<RDS엔드포인트>:5432/tryl
   REDIS_URL=redis://<ElastiCache엔드포인트>:6379/0

   JWT_SECRET=강한랜덤시크릿

   STORAGE_BACKEND=s3
   S3_BUCKET=your-bucket
   S3_REGION=ap-northeast-2
   S3_BASE_URL=https://your-cdn-or-s3-url

   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...

   CORS_ORIGINS=["https://app.yourdomain.com","https://yourdomain.com"]
   ```

4. **ECR 로그인 & 실행**

   ```bash
   aws ecr get-login-password --region ap-northeast-2 | sudo docker login --username AWS --password-stdin <계정ID>.dkr.ecr.ap-northeast-2.amazonaws.com

   sudo docker pull <ECR_URI>/tryl-api:latest
   sudo docker run -d --name api --restart unless-stopped \
     -p 8000:8000 \
     --env-file .env.production \
     <ECR_URI>/tryl-api:latest
   ```

   또는 이 레포의 **EC2용 compose** 사용 시 (이미지명이 `tryl-api:latest`여야 함):

   ```bash
   sudo docker pull <ECR_URI>/tryl-api:latest
   sudo docker tag <ECR_URI>/tryl-api:latest tryl-api:latest
   # docker-compose.ec2-api.yml + .env.production 을 같은 디렉터리에 두고
   sudo docker compose -f docker-compose.ec2-api.yml up -d
   ```

5. **헬스 체크**

   ```bash
   curl http://localhost:8000/healthz
   ```

---

## 5. Web EC2 올리기

1. **EC2 인스턴스**
   - API와 동일 리전/VPC 권장 (필수 아님)
   - Security group: 3000(또는 80) from 0.0.0.0/0 또는 ALB

2. **Docker 설치** (위와 동일)

3. **.env.production** (Web은 API URL만 필요)

   ```env
   NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
   ```

   (실제 API 도메인으로 변경. 아직 도메인 없으면 `http://<API-EC2-퍼블릭-IP>:8000` 등으로 테스트 가능)

4. **이미지 실행**

   ```bash
   sudo docker pull <ECR_URI>/tryl-web:latest
   sudo docker run -d --name web --restart unless-stopped \
     -p 3000:3000 \
     --env-file .env.production \
     <ECR_URI>/tryl-web:latest
   ```

   빌드 시점에 `NEXT_PUBLIC_*`가 박히므로, URL을 바꿀 때는 **이미지를 다시 빌드**해야 할 수 있음. 그때는 동일한 `NEXT_PUBLIC_API_BASE_URL`로 빌드 후 새 이미지 푸시 → Web EC2에서 pull & 재실행.

5. **확인**

   ```bash
   curl -I http://localhost:3000
   ```

---

## 6. Worker EC2 올리기

1. **EC2 인스턴스**
   - **RDS, ElastiCache와 같은 VPC** (필수)
   - Security group: Outbound만 있으면 됨 (RDS 5432, Redis 6379, S3 443 등)

2. **Docker 설치**

3. **.env.production** (API와 비슷, RDS/Redis/S3 동일)

   ```env
   DATABASE_URL=postgresql://유저:비밀번호@<RDS엔드포인트>:5432/tryl
   REDIS_URL=redis://<ElastiCache엔드포인트>:6379/0

   TRYON_PROVIDER=mock
   # 실제 연동 시: TRYON_PROVIDER=nano_banana + 해당 provider env

   STORAGE_BACKEND=s3
   S3_BUCKET=your-bucket
   S3_REGION=ap-northeast-2
   S3_BASE_URL=https://your-cdn-or-s3-url

   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   ```

4. **실행**

   ```bash
   sudo docker pull <ECR_URI>/tryl-worker:latest
   sudo docker run -d --name worker --restart unless-stopped \
     --env-file .env.production \
     <ECR_URI>/tryl-worker:latest
   ```

5. **확인**

   - API에서 try-on 요청 후, Worker 로그: `docker logs -f worker`

---

## 7. 순서 요약

| 순서 | 작업 |
|------|------|
| 1 | RDS 생성 → 엔드포인트 확인 → DB(tryl) + schema 적용 |
| 2 | ElastiCache(Redis) 생성 또는 API EC2에 Redis 컨테이너 |
| 3 | 이미지 빌드 & ECR 푸시 |
| 4 | API EC2 생성 → Docker → .env.production → API 컨테이너 실행 |
| 5 | Web EC2 생성 → Docker → .env.production → Web 컨테이너 실행 |
| 6 | Worker EC2 생성 → Docker → .env.production → Worker 컨테이너 실행 |

---

## 8. 도메인 & HTTPS (선택)

- **API**: `api.yourdomain.com` → Route 53 A 레코드(또는 CNAME) → API EC2 퍼블릭 IP 또는 ALB
- **Web**: `app.yourdomain.com` → Web EC2 또는 ALB
- HTTPS: ALB에 ACM 인증서 붙이거나, EC2 위에 Nginx/Caddy로 프록시 + Let’s Encrypt

---

## 9. EC2용 Compose 파일 (선택)

각 서버에 `docker-compose.ec2-*.yml` + `.env.production`만 두고 쓰려면:

- **API 서버**: `docker-compose.ec2-api.yml`
- **Web 서버**: `docker-compose.ec2-web.yml`
- **Worker 서버**: `docker-compose.ec2-worker.yml`

Compose는 이미지명 `tryl-api:latest`, `tryl-web:latest`, `tryl-worker:latest`를 사용합니다. ECR에서 pull한 뒤 같은 이름으로 태그한 다음 실행하면 됩니다.

```bash
# 예: API 서버
sudo docker pull <ECR_URI>/tryl-api:latest
sudo docker tag <ECR_URI>/tryl-api:latest tryl-api:latest
sudo docker compose -f docker-compose.ec2-api.yml up -d
```

---

## 10. 트러블슈팅

### `KeyError: 'ContainerConfig'` (web 재생성 시)

- **원인**: 예전 **docker-compose v1** (Python, `docker-compose` 명령)이 최신 Docker Engine API와 맞지 않아서 발생.
- **해결**: **Docker Compose V2** 플러그인 사용. 명령은 **띄어쓰기** 있는 `docker compose`를 쓴다.

  Ubuntu 기본 저장소에는 플러그인이 없으므로 **Docker 공식 APT 저장소**를 추가한 뒤 설치한다:

  ```bash
  # Docker 공식 저장소 추가 (Ubuntu)
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update

  # Compose V2 플러그인 설치
  sudo apt-get install -y docker-compose-plugin

  # 확인
  docker compose version
  ```

  이후에는 항상 `docker-compose` 대신 `docker compose`로 실행:

  ```bash
  docker compose -f docker-compose.yml up -d
  # 또는 EC2 단일 서비스
  sudo docker compose -f docker-compose.ec2-api.yml up -d
  ```

- **Web이 Exit 0로 남아 있는 경우**: 위 오류로 재생성이 실패한 뒤 예전 컨테이너만 남은 상태일 수 있음. V2로 전환한 뒤 `docker compose up -d` 다시 실행하면 된다. 필요하면 `docker rm <web컨테이너이름>` 후 다시 up.
