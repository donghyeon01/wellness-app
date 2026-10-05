# Wellness App

> **일정정리·캘린더·메모·뽀모도로·일기를 하나로 통합한 웰니스 생산성 웹 애플리케이션**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

## 기능 (Phase 1 — MVP)

- **인증** — Argon2id 비밀번호 해시, 세션 httpOnly 쿠키, CSRF 토큰 검증
- **일정정리** — TODO CRUD, 우선순위·마감일·필터
- **캘린더** — react-big-calendar 기반 일정 관리
- **메모** — 마크다운 에디터
- **뽀모도로** — 집중/휴식 타이머 + 세션 기록
- **일기** — 감정 상태 기록
- **대시보드** — 오늘의 할 일·일정·기분 통합 뷰
- **테마** — 다크/라이트 모드

## 기술 스택

| 구분     | 기술                                            |
| -------- | ----------------------------------------------- |
| Frontend | React 18 + Vite + TypeScript                    |
| UI       | Tailwind CSS + shadcn/ui                        |
| 상태관리 | Zustand (클라이언트) + TanStack Query (서버)    |
| Backend  | Express + TypeScript                            |
| API      | REST + Zod 검증                                 |
| ORM / DB | Prisma / SQLite (개발) → PostgreSQL 전환 설계   |
| 인증     | Session + httpOnly Cookie + CSRF 토큰, Argon2id |

## Getting Started

### Prerequisites

- Node.js 20+

### Run

```bash
git clone https://github.com/donghyeon01/wellness-app.git
cd wellness-app

npm install   # workspaces(client, server) 일괄 설치 + prisma generate

# 서버 환경 변수 (SQLite 경로 — 기본값 그대로 사용 가능)
cp server/.env.example server/.env

# DB 스키마 적용
cd server && npx prisma db push && cd ..

# 개발 서버 기동 (터미널 2개)
npm run dev -w server   # API: http://localhost:3001
npm run dev -w client   # Web: http://localhost:5173
```

### Test / Verify

```bash
npm test        # workspaces 전체 vitest
npm run typecheck
npm run lint
```

## 프로젝트 구조

```text
wellness-app/           # npm workspaces 모노레포
├── client/             # React SPA — pages(Todos·Calendar·Memos·Pomodoro·Diary·Dashboard), stores
├── server/             # Express API — routes(auth·todos·events·memos·pomodoro·diary·settings), prisma
└── docs/               # 요구사항·아키텍처·보안·데이터 모델 문서
```

## 문서

- [요구사항 명세](docs/requirements.md)
- [아키텍처 설계](docs/architecture.md)
- [인증 및 보안](docs/auth-security.md)
- [데이터 모델](docs/data-model.md)
- [로드맵](docs/roadmap.md)

## 확장 계획

- **Phase 2**: 카카오톡 로그인, 휴대폰 인증, 친구 추가, 일정/일기 공유, 채팅, BGM, 커스텀 테마, 쉬움 모드, PWA
- **Phase 3**: 개인 Room 꾸미기 (Pixi.js), 2FA, 데스크탑 앱 (Tauri), 모바일 앱 (Capacitor)

## License

MIT
