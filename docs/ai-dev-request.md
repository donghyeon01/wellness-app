# AI DEV OS 구현 지시

## 중요 규칙

1. **저장소의 모든 문서를 먼저 읽어라.**
   - `README.md`
   - `docs/requirements.md`
   - `docs/architecture.md`
   - `docs/auth-security.md`
   - `docs/data-model.md`
   - `docs/roadmap.md`

2. **Phase 1 MVP만 구현해라.** Phase 2, 3 기능은 구현하지 마라.

3. **문서에 없는 요구사항을 임의로 추가하지 마라.**

4. **향후 확장 기능은 실제 구현하지 말고 경계만 확장 가능하게 유지해라.**
   - 인증: `AuthProvider` 인터페이스, `SessionStore` 인터페이스
   - 세션: 메모리 구현만, Redis 인터페이스만 정의
   - 실시간: WebSocket 모듈 위치만 비워둠
   - PWA: manifest.json 위치만 비워둠

5. **기술 스택을 변경하지 마라.**
   - Frontend: React 18 + Vite + TypeScript
   - UI: Tailwind CSS + shadcn/ui
   - 상태관리: Zustand (클라이언트) + TanStack Query (서버)
   - Backend: Express + TypeScript
   - API: REST + Zod
   - ORM: Prisma
   - DB: SQLite
   - 인증: Session + httpOnly Cookie + CSRF
   - 비밀번호: Argon2id

6. **디렉토리 구조는 `docs/architecture.md`를 따라라.**

7. **각 기능의 인수 조건은 `docs/requirements.md`를 따라라.**

8. **인증 보안은 `docs/auth-security.md`를 따라라.**

9. **데이터 모델은 `docs/data-model.md`를 따라라.**

10. **빌드와 테스트가 통과해야 한다.**
    - `cd client && npm install && npm run build`
    - `cd server && npm install && npm run build`
    - `cd server && npx prisma generate`
    - `cd server && npx prisma db push`
