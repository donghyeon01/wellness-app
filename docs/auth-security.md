# 인증 및 보안 설계

## 비밀번호 해시

### 알고리즘: Argon2id

OWASP 권장 1순위. bcrypt 대비 GPU 공격 저항성이 높음.

```typescript
// server/src/services/auth/password.ts
import argon2 from "argon2";

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456,  // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  return argon2.verify(hash, plain);
}
```

### 비밀번호 정책

| 항목 | 값 |
|---|---|
| 최소 길이 | 8자 |
| 최대 길이 | 128자 |
| 복잡도 | 최소 1개 이상 영문 + 숫자 (선택적) |
| 검증 | Zod 스키마로 회원가입 시 검증 |

## 세션 관리

### 쿠키 설정

| 항목 | 값 | 비고 |
|---|---|---|
| 이름 | `sid` | |
| httpOnly | `true` | XSS로 쿠키 탈취 방지 |
| secure | `true` (운영) / `false` (개발) | HTTPS에서만 전송 |
| sameSite | `lax` | CSRF 1차 방어 |
| maxAge | 7일 | sliding expiration (활동 시마다 갱신) |
| path | `/` | |

### 세션 ID 생성

```typescript
import { randomUUID } from "node:crypto";

const sessionId = randomUUID(); // 예측 불가능
```

### 세션 저장소 인터페이스

```typescript
interface SessionData {
  userId: string;
  createdAt: number;
  lastAccess: number;
}

interface SessionStore {
  get(sessionId: string): SessionData | null;
  set(sessionId: string, data: SessionData, ttlSec: number): void;
  delete(sessionId: string): void;
  touch(sessionId: string, ttlSec: number): void; // 만료 연장
}
```

- Phase 1: `MemorySessionStore` (Map 기반)
- Phase 2: `RedisSessionStore`

### 세션 미들웨어

```typescript
// 모든 요청에서 쿠키의 sid를 확인하고 세션을 복원한다.
// 유효한 세션이면 req.user를 설정한다.
// 세션이 없으면 req.user = null.
// 활동 시마다 touch로 만료를 연장한다 (sliding expiration).
```

## CSRF 보안

### 토큰 발급

```typescript
// GET /api/auth/csrf-token
// 1. randomUUID()로 CSRF 토큰 생성
// 2. 세션에 csrfToken 저장
// 3. 응답 바디와 non-httpOnly 쿠키(csrf-token)로 전달
// 프론트엔드는 이 토큰을 메모리에 저장하고 모든 mutation 헤더에 포함
```

### 토큰 검증

```typescript
// 모든 POST/PUT/DELETE 요청에서:
// 1. X-CSRF-Token 헤더 값 추출
// 2. 세션에 저장된 csrfToken과 비교
// 3. 불일치 시 403 Forbidden
```

### 프론트엔드 CSRF 처리

```typescript
// client/src/lib/axios.ts
// axios 인터셉터: mutation 요청 시 X-CSRF-Token 헤더 자동 추가
// withCredentials: true (쿠키 전송)
```

## 인증 확장 (Phase 2+)

### 카카오톡 OAuth 2.0

```
[Browser] → GET /api/auth/kakao → redirect to Kakao authorize URL
[Kakao] → 사용자 동의 → Authorization Code 발급
[Browser] → GET /api/auth/kakao/callback?code=...
[Server] → code로 access_token 교환 → 사용자 정보 조회
[Server] → 기존 회원이면 세션 생성, 신규면 자동 가입 후 세션 생성
[Browser] → Set-Cookie: sid (httpOnly) → 대시보드 리다이렉트
```

User 모델 확장:

```prisma
model User {
  // ... 기존 필드
  provider     String   @default("email")  // "email" | "kakao" | "phone"
  providerId   String?           // 카카오 사용자 ID
}
```

### 휴대폰 인증 (SMS)

```
[Browser] → POST /api/auth/phone/send { phone } → 인증번호 SMS 발송
[Browser] → POST /api/auth/phone/verify { phone, code } → 검증
[Server] → 검증 성공 시 User.phoneVerified = true
```

SMS 제공자 (선택):
- Twilio (글로벌)
- 알리고 (국내)
- COOLSMS (국내)

### 2FA (Phase 3)

- TOTP (Time-based One-Time Password)
- Google Authenticator / Authy 호환
- `User.twoFactorSecret`에 TOTP 시크릿 저장
- 로그인 시 2FA 활성화 계정은 TOTP 코드 추가 입력

## 보안 체크리스트

- [ ] 비밀번호 평문 저장 여부 (Argon2id 해시 확인)
- [ ] 세션 쿠키 httpOnly 설정
- [ ] CSRF 토큰 검증 (모든 mutation)
- [ ] SQL 인젝션 방지 (Prisma 파라미터화 쿼리)
- [ ] XSS 방어 (React 기본 이스케이프, 마크다운 렌더링 sanitize)
- [ ] Rate limiting (로그인 시도 제한)
- [ ] CORS 설정 (개발: localhost, 운영: 도메인)
- [ ] 환경 변수 관리 (.env, .env.example)
- [ ] 에러 메시지에 민감 정보 노출 금지

## 알려진 의존성 취약점

`npm audit --audit-level=high` 실행 결과, 아래 패키지에서 high/critical 수준의 보안 권고가 확인되었다.
이들은 모두 **개발 전용 의존성**이며, 운영 빌드 또는 서버 런타임에 포함되지 않으므로 직접적인 운영 영향은 없다.

| 패키지 | 심각도 | 운영 영향 |
|---|---|---|
| `vite` | high | 클라이언트 개발 서버 기능으로, `vite build` 결과(정적 파일)에는 영향을 주지 않는다. |
| `vitest` | critical | 테스트 전용 의존성이며, `vitest --ui` 등 테스트 UI 서버를 명시적으로 실행하지 않는 한 운영/CI에 영향을 주지 않는다. |

Phase 2 이후 `npm update` 또는 `overrides`를 통해 안전한 버전으로 교체할 수 있으나,
현재 Phase 1 MVP 범위에서는 개발 의존성의 기능이 테스트/빌드에만 사용되므로 허용한다.
