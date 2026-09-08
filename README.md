# Wellness App

웰니스 생산성 웹 사이트 — 일정정리, 캘린더, 메모, 뽀모도로, 일기 기능을 통합한 생산성 도구.

## 기술 스택

- **Frontend**: React 18 + Vite + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **상태관리**: Zustand (클라이언트) + TanStack Query (서버)
- **Backend**: Express + TypeScript
- **API**: REST + Zod 검증
- **ORM**: Prisma
- **DB**: SQLite (개발) → PostgreSQL (운영)
- **인증**: Session + httpOnly Cookie + CSRF 토큰
- **비밀번호 해시**: Argon2id

## 기능 (Phase 1 — MVP)

1. 이메일/비밀번호 인증 (Argon2id + httpOnly 쿠키 + CSRF)
2. 일정정리 (TODO CRUD)
3. 캘린더 (react-big-calendar)
4. 메모 (마크다운 에디터)
5. 뽀모도로 타이머
6. 일기 (감정 상태)
7. 대시보드
8. 다크/라이트 테마

## 문서

- [요구사항 명세](docs/requirements.md)
- [아키텍처 설계](docs/architecture.md)
- [인증 및 보안](docs/auth-security.md)
- [데이터 모델](docs/data-model.md)
- [로드맵](docs/roadmap.md)
- [AI DEV OS 구현 지시](docs/ai-dev-request.md)

## 확장 계획

- **Phase 2**: 카카오톡 로그인, 휴대폰 인증, 친구 추가, 일정/일기 공유, 채팅, BGM, 커스텀 테마, 쉬움 모드, PWA
- **Phase 3**: 개인 Room 꾸미기 (Pixi.js), 2FA, 데스크탑 앱 (Tauri), 모바일 앱 (Capacitor)
