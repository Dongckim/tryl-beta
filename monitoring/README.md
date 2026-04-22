# Monitoring (Prometheus + Grafana)

EC2 / 로컬 환경에 Prometheus + Grafana 관측 스택을 오버레이로 추가하는 구성.

## 구성 요소

| 서비스 | 포트(호스트) | 역할 |
|--------|-------------|------|
| prometheus | 9090 | 메트릭 수집/저장 (30d retention) |
| grafana | 3001 | 대시보드·알림 UI |
| node-exporter | 9100 | 호스트 CPU/메모리/디스크/네트워크 |
| cadvisor | 8081 | 컨테이너별 리소스 |
| postgres-exporter | 9187 | Postgres 상태 (커넥션/쿼리/캐시) |
| redis-exporter | 9121 | Redis 상태 + `tryon:jobs` 큐 길이 |
| api `/metrics` | 8000 | FastAPI 요청수·지연·에러 |
| worker `/metrics` | 9108 (내부) | try-on 잡 처리수·지연·재시도 |

호스트 포트는 모두 **127.0.0.1 에만 바인딩** — 퍼블릭 실수 노출 방지.

## 실행

로컬:
```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d
```

prod (빌드):
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d --build
```

EC2 (GHCR 이미지 기반 — GitHub Actions deploy 워크플로가 이미 이 명령 사용):
```bash
docker compose -f docker-compose.ec2.yml -f docker-compose.monitoring.yml up -d
```

## 접속 (127.0.0.1 바인딩이므로)

**로컬**: 브라우저에서 `http://localhost:9090`, `http://localhost:3001` 바로 접근.

**EC2**: SSH 터널로 로컬 포트 포워딩.
```bash
ssh -L 9090:localhost:9090 -L 3001:localhost:3001 \
    -i tryl-keypair-ec2.pem ec2-user@<EC2_IP>
# 이후 로컬 브라우저에서 http://localhost:9090, http://localhost:3001
```

Grafana 초기 로그인: `admin` / `${GRAFANA_ADMIN_PASSWORD:-admin}` (반드시 변경).

## 커스텀 비즈니스 메트릭

### API (`/metrics` @ 8000)
prometheus-fastapi-instrumentator가 자동 노출:
- `http_requests_total{handler, method, status}`
- `http_request_duration_seconds_bucket` (p50/p95/p99 계산 가능)
- `http_request_size_bytes`, `http_response_size_bytes`

### Worker (`/metrics` @ 9108, 내부 전용)
`worker/core/metrics.py` 정의:
- `tryon_jobs_processed_total{status="completed|failed"}` — 완료/실패 카운터
- `tryon_job_duration_seconds` — 잡 처리 시간 Histogram (0.5s ~ 300s buckets)
- `tryon_job_retries_total` — 재시도 enqueue 카운터
- `tryon_worker_up` — 워커 consume 루프 생존 게이지

### 큐 깊이
redis-exporter `REDIS_EXPORTER_CHECK_KEYS=tryon:jobs` 설정으로:
- `redis_key_size{key="tryon:jobs"}` — 대기 중인 잡 수

## 유용한 PromQL 예시

```promql
# API 5xx 비율
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# API p95 지연 (초)
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))

# try-on 잡 실패율
rate(tryon_jobs_processed_total{status="failed"}[5m])
  / rate(tryon_jobs_processed_total[5m])

# try-on 잡 p95 처리시간
histogram_quantile(0.95, sum by (le) (rate(tryon_job_duration_seconds_bucket[5m])))

# 큐 적체 (현재 대기 수)
redis_key_size{key="tryon:jobs"}
```

## Grafana 대시보드 import

Prometheus datasource는 자동 프로비저닝됨. 커뮤니티 대시보드는 UI에서 ID로 import:
`Dashboards → New → Import` 에 ID 입력:

| 대시보드 | ID | 설명 |
|---------|----|----|
| Node Exporter Full | `1860` | 호스트 전반 |
| cAdvisor (Docker) | `19792` | 컨테이너별 리소스 |
| PostgreSQL | `9628` | Postgres 핵심 지표 |
| Redis | `763` | Redis 핵심 지표 |
| FastAPI | `14282` | HTTP 요청률/지연/에러 |

Datasource는 `Prometheus` 선택.

## EC2 배포 주의

`docker-compose.ec2.yml` 에는 `db`/`redis` 서비스가 없습니다 (RDS/ElastiCache 등 외부 사용 가정). 그래서 exporter 커넥션 문자열을 `.env` 에서 주입하세요:

```bash
# EC2의 ~/tryl-beta/.env (또는 배포 쉘에서 export)
POSTGRES_EXPORTER_DSN=postgresql://USER:PASS@<rds-endpoint>:5432/tryl?sslmode=require
REDIS_EXPORTER_ADDR=redis://<elasticache-endpoint>:6379
GRAFANA_ADMIN_PASSWORD=<strong-password>
```

없으면 기본값(`db:5432` / `redis:6379`)을 쓰는데 EC2에는 그 서비스가 없어 exporter가 실패합니다.

## Prometheus 설정 변경 후 리로드

`monitoring/prometheus.yml`만 수정했다면 재시작 없이 리로드 가능 (`--web.enable-lifecycle` 로 켜져 있음):
```bash
curl -X POST http://localhost:9090/-/reload
# 또는
docker compose restart prometheus
```

## 알림 (다음 단계)

Grafana `Alerting → Contact points` 에 Slack webhook 등록 후 룰:
- API 5xx 비율 > 1% 5분 지속
- API p95 지연 > 1s 5분 지속
- `tryon_jobs_processed_total{status="failed"}` 증가율 > 10/min
- `redis_key_size{key="tryon:jobs"}` > 100 5분 지속 (큐 적체)
- 호스트 디스크 > 85%
- Postgres 커넥션 사용률 > 80%

## 운영 팁

- Prometheus retention 30일 (`docker-compose.monitoring.yml` `--storage.tsdb.retention.time`)
- 디스크 사용량 점검: `docker system df`
- prometheus 타겟 상태: http://localhost:9090/targets
