# 요구사항 명세

## Phase 1 — MVP

### 1. 인증

| 항목 | 내용 |
|---|---|
| 회원가입 | 이메일, 비밀번호, 이름 |
| 비밀번호 해시 | Argon2id (memoryCost: 19456, timeCost: 2, parallelism: 1) |
| 로그인 | 이메일/비밀번호 검증 → 세션 생성 |
| 세션 | httpOnly 쿠키 (sid), secure, sameSite=lax, 7일 sliding expiration |
| CSRF | csrf-csrf 미들웨어, X-CSRF-Token 헤더 검증 |
| 로그아웃 | 세션 삭제 + 쿠키 만료 |
| 세션 저장소 | 메모리 Map (개발), Redis (운영 전환 인터페이스) |

**인수 조건**:
- 회원가입 시 비밀번호가 Argon2id로 해시되어 저장됨
- 로그인 성공 시 httpOnly 쿠키가 설정됨
- 로그아웃 시 쿠키가 만료됨
- POST/PUT/DELETE 요청에 CSRF 토큰이 없으면 403 반환
- 인증되지 않은 요청은 401 반환

### 2. 일정정리 (TODO)

| 항목 | 내용 |
|---|---|
| 생성 | title, description, priority(0/1/2), dueDate |
| 조회 | 목록(필터: 완료/미완료, 우선순위), 단건 |
| 수정 | title, description, priority, dueDate, completed |
| 삭제 | 소프트 삭제 없이 hard delete |
| 정렬 | 기본: dueDate 오름차순, 완료는 하단 |

**인수 조건**:
- 자신의 TODO만 조회/수정/삭제 가능
- priority가 0~2 범위 외이면 400
- dueDate 없이 생성 가능

### 3. 캘린더

| 항목 | 내용 |
|---|---|
| 뷰 | 월간 뷰 (react-big-calendar) |
| 이벤트 생성 | title, start, end, description |
| 이벤트 수정 | 드래그 앤 드롭으로 날짜 이동, 크기 조절로 기간 변경 |
| 이벤트 삭제 | 삭제 확인 모달 |
| 조회 | 월 단위 조회, 일정이 있는 날짜에 표시 |

**인수 조건**:
- start < end 검증
- 자신의 이벤트만 조작 가능
- 드래그 앤 드롭 후 서버에 자동 저장

### 4. 메모

| 항목 | 내용 |
|---|---|
| 에디터 | @uiw/react-md-editor (작성 + 미리보기 분할) |
| 생성 | title, content(markdown), category |
| 조회 | 목록(카테고리 필터), 단건 |
| 수정 | title, content, category |
| 삭제 | hard delete |
| 카테고리 | 자유 텍스트 (사용자 정의) |

**인수 조건**:
- 마크다운이 HTML로 렌더링됨
- 자신의 메모만 조회/수정/삭제 가능

### 5. 뽀모도로 타이머

| 항목 | 내용 |
|---|---|
| 기본 주기 | 25분 집중 / 5분 휴식 |
| 설정 | 집중/휴식 시간 사용자 설정 가능 |
| 카운트다운 | 클라이언트 타이머 (Zustand) |
| 세션 기록 | 집중 완료 시 서버에 세션 저장 (duration, type, completedAt) |
| 통계 | 일/주/월 집중 시간 합계 |

**인수 조건**:
- 타이머가 브라우저 탭을 닫아도 백그라운드에서 동작 (정확도는 클라이언트 기준)
- 집중 세션 완료 시 서버에 자동 저장
- 휴식 세션은 기록하지 않음 (옵션)

### 6. 일기

| 항목 | 내용 |
|---|---|
| 감정 상태 | happy, neutral, sad, angry, anxious (5종) |
| 작성 | mood, content, date |
| 조회 | 날짜별 단건, 월간 목록 |
| 수정 | mood, content |
| 삭제 | hard delete |
| 제약 | 하루 1편 (userId + date unique) |

**인수 조건**:
- 같은 날짜에 2개 생성 시 409
- mood가 허용 값 외이면 400

### 7. 대시보드

| 항목 | 내용 |
|---|---|
| 오늘 할 일 | 미완료 TODO 목록 (dueDate 오늘 또는 과거) |
| 뽀모도로 통계 | 오늘 집중 시간 합계, 연속 집중 일수 |
| 최근 일기 | 최근 3편 일기 미리보기 (mood + content 100자) |
| 날짜 | 오늘 날짜 표시 |

**인수 조건**:
- 인증된 사용자만 접근
- 데이터가 없을 경우 빈 상태 표시

### 8. 테마

| 항목 | 내용 |
|---|---|
| 모드 | light, dark, system |
| 전환 | 헤더 토글 버튼 |
| 저장 | 사용자 설정 (DB + localStorage) |
| 구현 | Tailwind CSS darkMode: 'class' |

**인수 조건**:
- 시스템 모드는 OS 설정을 따름
- 새로고침 후에도 테마 유지

## Phase 2 — 소셜 + 실시간 (MVP 이후)

- 카카오톡 OAuth 2.0 로그인
- 휴대폰 번호 인증 (SMS)
- 친구 추가 (요청/수락/거절)
- 일정/일기 공유 (ACL 권한: read, comment)
- 채팅 (DM + 그룹, WebSocket)
- BGM 재생 (Howler.js, 저작권 무료 음원)
- 커스텀 테마 (사용자 정의 색상 팔레트)
- 쉬움 모드 (UI 단순화, 큰 글씨)
- PWA (Service Worker, 오프라인 지원)

## Phase 3 — 몰입형 경험

- 개인 Room 꾸미기 (Pixi.js 2D 캔버스)
- 2FA (TOTP)
- 데스크탑 앱 (Tauri)
- 모바일 앱 (Capacitor)
