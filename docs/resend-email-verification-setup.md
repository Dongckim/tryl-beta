# Resend 이메일 인증 설정 및 사용 흐름

## 1. Resend 설정 (이메일 발송)

### 1.1 Resend 가입 및 API 키

1. [Resend](https://resend.com) 가입
2. **API Keys**에서 키 발급 (예: `re_xxxxxxxx`)
3. 서버 `.env`에 추가:
   ```env
   RESEND_API_KEY=re_xxxxxxxx
   EMAIL_FROM=verify@tryl.me
   ```
4. **발신 도메인 인증** (tryl.me):
   - Resend 대시보드 → **Domains** → **Add Domain** → `tryl.me` 입력
   - DNS에 안내된 레코드 추가 (SPF, DKIM 등)
   - 인증 완료 후 `verify@tryl.me` 또는 `no-reply@tryl.me`로 발송 가능

> `RESEND_API_KEY`가 없으면 인증 코드는 DB에만 저장되고 메일은 발송되지 않습니다 (로그 경고). 로컬 테스트 시 API 키 없이 동작 확인 가능.

---

## 2. 이메일 인증이 이루어지는 위치 (플로우)

### 2.1 회원가입 → 코드 발송

- **웹**: [tryl.me/auth/sign-up](https://tryl.me/auth/sign-up)  
  - 초대코드, 이름, 이메일, 비밀번호, 닉네임 입력 후 **Sign up**  
  - 서버가 6자리 코드 생성 후 **Resend로 해당 이메일 발송**  
  - 화면이 **코드 입력 단계**로 전환됨  

### 2.2 코드 입력 → 인증 완료 (자동 로그인)

- **같은 페이지 (sign-up)**  
  - “We sent a 6-digit verification code to your email.” 아래에 **6자리 코드 입력**  
  - **Verify** 클릭 → `POST /auth/verify-email-code`  
  - 성공 시 `email_verified=true`, trial 20 지급, **자동 로그인** 후 `/profile`로 이동  

### 2.3 메일 안 왔을 때 / 코드 만료

- **웹 (sign-up 코드 입력 단계)**  
  - **Resend verification code** 버튼 → `POST /auth/resend-verification` (60초 쿨다운)  
- **이미 가입했지만 아직 인증 안 한 경우**  
  - [tryl.me/auth/verify](https://tryl.me/auth/verify)  
  - 이메일 입력 + 6자리 코드 입력 → **Verify**  
  - 또는 **Resend verification code**로 새 코드 발송  

### 2.4 로그인 시 미인증

- **웹**: [tryl.me/auth/sign-in](https://tryl.me/auth/sign-in)  
  - 이메일/비밀번호로 로그인 시도 → 서버가 `email_not_verified` 반환  
  - **/auth/verify?email=xxx** 로 리다이렉트되어, 코드 입력 또는 재전송 가능  

- **Extension**  
  - 로그인 실패 시 “Email verification required”  
  - **Open Tryl website** 클릭 → tryl.me 인증 페이지(위 verify)로 이동  

---

## 3. 정리: “Resend API로 이메일 인증”이 일어나는 곳

| 단계 | 어디서 | 설명 |
|------|--------|------|
| **코드 발송** | `POST /auth/sign-up` 성공 시 | 서버가 6자리 코드 생성 → **Resend API**로 `EMAIL_FROM` → 가입 이메일 발송 |
| **재전송** | `POST /auth/resend-verification` | 새 6자리 코드 생성 → **Resend API**로 같은 이메일 발송 (60초 쿨다운) |
| **인증 완료** | `POST /auth/verify-email-code` | 클라이언트가 입력한 코드와 DB 저장값 비교 → 성공 시 `email_verified=true`, 토큰 발급 (Resend 호출 없음) |

- **Resend를 쓰는 건 “코드 보내기”**  
  - sign-up 직후 1회  
  - resend-verification 호출 시 1회  
- **실제 “인증”**은 **웹/앱에서 코드 입력** → **API `verify-email-code`** 호출로 처리됩니다.

---

## 4. 시드 초대코드 (최초 가입용)

베타용 시드 코드는 DB에 직접 넣습니다.

```sql
INSERT INTO invite_codes (code, created_by_user_id, is_seed, is_active)
VALUES ('BETA-2026', NULL, true, true);
```

- `created_by_user_id = NULL` → 시드 코드  
- 가입 시 `invite_code`에 위 코드를 입력하면 가입 가능  
- 여러 명이 같은 시드 코드로 가입 가능 (옵션 B)

---

## 5. 환경 변수 요약

| 변수 | 필수 | 설명 |
|------|------|------|
| `RESEND_API_KEY` | 프로덕션에서 권장 | Resend API 키 (없으면 메일 미발송, 로그만) |
| `EMAIL_FROM` | 선택 (기본값 있음) | 발신 주소 (예: `verify@tryl.me`), 도메인 인증 필요 |

위 설정 후 **tryl.me**에서 회원가입 → 이메일 수신 → 코드 입력까지가 Resend와 연동된 전체 이메일 인증 흐름입니다.
