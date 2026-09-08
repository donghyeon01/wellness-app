# 아키텍처 설계

## 시스템 구조

```
wellness-app/
├── client/              # React 프론트엔드 (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # shadcn/ui 기반 컴포넌트
│   │   │   ├── calendar/     # react-big-calendar 래퍼
│   │   │   ├── pomodoro/     # 타이머 컴포넌트
│   │   │   ├── editor/       # 마크다운 에디터 래퍼
│   │   │   ├── theme/        # 테마 프로바이더
│   │   │   └── layout/       # 헤더, 사이드바, 페이지 레이아웃
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Calendar.tsx
│   │   │   ├── Todos.tsx
│   │   │   ├── Memos.tsx
│   │   │   ├── Pomodoro.tsx
│   │   │   ├── Diary.tsx
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── stores/          # Zustand (클라이언트 상태)
│   │   │   ├── pomodoro.ts  # 타이머 상태
│   │   │   ├── theme.ts     # 테마 상태
│   │   │   └── ui.ts        # 사이드바 토글 등
│   │   ├── api/             # TanStack Query hooks
│   │   │   ├── auth.ts
│   │   │   ├── todos.ts
│   │   │   ├── events.ts
│   │   │   ├── memos.ts
│   │   │   ├── pomodoro.ts
│   │   │   └── diary.ts
│   │   ├── lib/
│   │   │   ├── axios.ts     # axios 인스턴스 (withCredentials)
│   │   │   ├── csrf.ts      # CSRF 토큰 관리
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── types/
│   │   │   └── schemas.ts   # Zod 스키마 + 타입
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/              # Express 백엔드
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── todos.ts
│   │   │   ├── events.ts
│   │   │   ├── memos.ts
│   │   │   ├── pomodoro.ts
│   │   │   └── diary.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts       # 세션 검증
│   │   │   ├── csrf.ts        # CSRF 토큰 검증
│   │   │   ├── error-handler.ts
│   │   │   └── validate.ts    # Zod 검증
│   │   ├── services/
│   │   │   ├── auth/
│   │   │   │   ├── password.ts  # Argon2id
│   │   │   │   ├── session.ts    # 세션 관리
│   │   │   │   └── csrf.ts       # CSRF 토큰
│   │   │   ├── todo.ts
│   │   │   ├── event.ts
│   │   │   ├── memo.ts
│   │   │   ├── pomodoro.ts
│   │   │   └── diary.ts
│   │   ├── sessions/
│   │   │   ├── store.ts       # SessionStore 인터페이스
│   │   │   ├── memory.ts      # 메모리 구현 (개발)
│   │   │   └── redis.ts       # Redis 구현 (운영, Phase 2)
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── index.ts
│   ├── tsconfig.json
│   └── package.json
└── docs/
```

## 상태관리 책임 분리

### Zustand (클라이언트 전용 상태)

| Store | 상태 | 비고 |
|---|---|---|
| `pomodoro` | timerState, duration, mode(focus/break), isRunning, remaining | 타이머 로직 |
| `theme` | currentTheme (light/dark/system) | localStorage 동기화 |
| `ui` | sidebarOpen, activeMenu | UI 토글 |

### TanStack Query (서버 데이터)

| Hook | 쿼리 키 | 비고 |
|---|---|---|
| `useTodos` | `['todos', filters]` | 목록 조회 |
| `useTodo` | `['todos', id]` | 단건 조회 |
| `useCreateTodo` | mutation → invalidate `['todos']` | |
| `useUpdateTodo` | mutation → invalidate `['todos', id]` | |
| `useDeleteTodo` | mutation → invalidate `['todos']` | |
| `useEvents` | `['events', monthRange]` | 월간 캘린더 |
| `useMemos` | `['memos', category]` | |
| `usePomodoroSessions` | `['pomodoro', dateRange]` | 세션 기록 |
| `useDiaries` | `['diaries', month]` | |
| `useDashboard` | `['dashboard']` | 대시보드 통합 |

## API 계약 (REST + Zod)

### 공통

- 모든 요청/응답은 Zod 스키마로 검증
- 인증 필요 엔드포인트: 세션 쿠키 + CSRF 토큰
- 에러 응답: `{ error: string, code?: string }`

### 인증

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/me` | 현재 사용자 |
| GET | `/api/auth/csrf-token` | CSRF 토큰 발급 |

### TODO

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/todos` | 목록 조회 (쿼리: completed, priority) |
| GET | `/api/todos/:id` | 단건 조회 |
| POST | `/api/todos` | 생성 |
| PUT | `/api/todos/:id` | 수정 |
| DELETE | `/api/todos/:id` | 삭제 |

### 캘린더 이벤트

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/events` | 월간 조회 (쿼리: start, end) |
| POST | `/api/events` | 생성 |
| PUT | `/api/events/:id` | 수정 |
| DELETE | `/api/events/:id` | 삭제 |

### 메모

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/memos` | 목록 조회 (쿼리: category) |
| GET | `/api/memos/:id` | 단건 조회 |
| POST | `/api/memos` | 생성 |
| PUT | `/api/memos/:id` | 수정 |
| DELETE | `/api/memos/:id` | 삭제 |

### 뽀모도로

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/pomodoro/sessions` | 세션 기록 (쿼리: date, range) |
| POST | `/api/pomodoro/sessions` | 세션 저장 |
| GET | `/api/pomodoro/stats` | 통계 (쿼리: range=day\|week\|month) |

### 일기

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/diaries` | 월간 목록 (쿼리: month) |
| GET | `/api/diaries/:date` | 날짜별 단건 |
| POST | `/api/diaries` | 생성 |
| PUT | `/api/diaries/:id` | 수정 |
| DELETE | `/api/diaries/:id` | 삭제 |

### 대시보드

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/dashboard` | 통합 데이터 |

## 확장 경계 (Phase 2+)

### 인증 확장

```typescript
// 인증 Provider 인터페이스 — Phase 2에서 kakao, phone 추가
interface AuthProvider {
  authenticate(credentials: unknown): Promise<User>;
}
```

- `EmailPasswordProvider` (Phase 1)
- `KakaoOAuthProvider` (Phase 2)
- `PhoneOTPProvider` (Phase 2)

### 세션 저장소

```typescript
// 세션 저장소 인터페이스 — Phase 2에서 Redis로 전환
interface SessionStore {
  get(sessionId: string): Promise<Session | null>;
  set(sessionId: string, session: Session, ttl: number): Promise<void>;
  delete(sessionId: string): Promise<void>;
  touch(sessionId: string, ttl: number): Promise<void>;
}
```

- `MemorySessionStore` (Phase 1)
- `RedisSessionStore` (Phase 2)

### 실시간 통신 (Phase 2)

```typescript
// WebSocket 서버 — Express와 같은 포트, 별도 모듈
// server/src/ws/index.ts
function attachWebSocket(server: Server): WebSocketServer {
  // 인증: 세션 쿠키 검증
  // 룸: 친구 DM, 그룹 채팅
  // 메시지: 영구 저장 (Message 모델)
}
```

### PWA (Phase 2)

- `client/public/manifest.json`
- `client/public/sw.js` — Service Worker
- 오프라인 폴백 페이지

### 데스크탑/모바일 (Phase 3)

- API 클라이언트가 프레임워크 종속성을 가지지 않음
- 환경 변수로 플랫폼 구분 (`VITE_PLATFORM=web|desktop|mobile`)
- Tauri: `desktop/` 디렉토리에서 클라이언트 빌드 결과를 래핑
- Capacitor: `mobile/` 디렉토리에서 클라이언트 빌드 결과를 래핑
