# 데이터 모델

## Phase 1 — MVP

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String   // Argon2id 해시
  name      String
  settings  UserSettings?
  todos     Todo[]
  events    Event[]
  memos     Memo[]
  sessions  PomodoroSession[]
  diaries   Diary[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model UserSettings {
  userId    String  @id
  theme     String  @default("system")  // "light" | "dark" | "system"
  pomodoroFocus  Int @default(1500)     // 초 단위 (25분)
  pomodoroBreak  Int @default(300)      // 초 단위 (5분)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Todo {
  id          String   @id @default(cuid())
  userId      String
  title       String
  description String?
  priority    Int      @default(0)  // 0=low, 1=med, 2=high
  dueDate     DateTime?
  completed   Boolean  @default(false)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, completed])
  @@index([userId, dueDate])
}

model Event {
  id          String   @id @default(cuid())
  userId      String
  title       String
  description String?
  start       DateTime
  end         DateTime
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, start])
}

model Memo {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String   // markdown
  category  String?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, category])
}

model PomodoroSession {
  id          String   @id @default(cuid())
  userId      String
  duration    Int      // 초 단위
  type        String   // "focus" | "break"
  completedAt DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, completedAt])
}

model Diary {
  id        String   @id @default(cuid())
  userId    String
  mood      String   // "happy" | "neutral" | "sad" | "angry" | "anxious"
  content   String
  date      DateTime @db.Date
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, date])
  @@index([userId, date])
}
```

## Phase 2 — 소셜 + 실시간

### User 확장

```prisma
model User {
  // ... Phase 1 필드
  phone          String?  @unique
  phoneVerified  Boolean  @default(false)
  provider       String   @default("email")  // "email" | "kakao" | "phone"
  providerId     String?
  twoFactorSecret String?  // Phase 3
}
```

### 소셜 그래프

```prisma
model UserRelationship {
  id        String   @id @default(cuid())
  requester String   // 요청자 userId
  target    String   // 대상 userId
  status    String   @default("pending")  // "pending" | "accepted" | "blocked"
  createdAt DateTime @default(now())

  @@unique([requester, target])
  @@index([target, status])
}
```

### 공유

```prisma
model Share {
  id           String   @id @default(cuid())
  resourceType String   // "todo" | "event" | "memo" | "diary"
  resourceId   String
  sharedBy     String
  sharedWith   String
  permission   String   @default("read")  // "read" | "comment"
  createdAt    DateTime @default(now())

  @@unique([resourceType, resourceId, sharedWith])
  @@index([sharedWith, resourceType])
}
```

### 채팅

```prisma
model ChatRoom {
  id        String   @id @default(cuid())
  type      String   @default("dm")  // "dm" | "group"
  name      String?  // group인 경우
  members   ChatMember[]
  messages  Message[]
  createdAt DateTime @default(now())
}

model ChatMember {
  id        String   @id @default(cuid())
  roomId    String
  userId    String
  joinedAt  DateTime @default(now())
  room      ChatRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([roomId, userId])
}

model Message {
  id        String   @id @default(cuid())
  roomId    String
  senderId  String
  content   String
  readBy    String   @default("[]")  // JSON: 읽은 사용자 ID 배열
  createdAt DateTime @default(now())
  room      ChatRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  sender    User     @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@index([roomId, createdAt])
}
```

### BGM

```prisma
model BgmTrack {
  id        String  @id @default(cuid())
  title     String
  artist   String
  source   String  // "youtube-audio-library" | "pixabay" | "fma"
  url      String  // CDN 경로
  duration Int     // 초 단위
  category String  // "lofi" | "ambient" | "nature" | "piano"
  license  String  // 저작권 정보
}
```

## Phase 3 — 몰입형

### Room

```prisma
model Room {
  id         String  @id @default(cuid())
  userId     String  @unique
  background String  @default("default-room")
  items      String  // JSON: [{ type, x, y, scale, rotation }]
  user       User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## DB 전환 전략

### SQLite → PostgreSQL

Prisma schema에서 `provider`만 변경:

```prisma
// 개발
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")  // "file:./dev.db"
}

// 운영
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // "postgresql://user:pass@host:5432/db"
}
```

주의사항:
- `@db.Date` → PostgreSQL에서는 그대로 동작
- SQLite는 JSON 타입을 TEXT로 저장하므로 `readBy` 필드는 마이그레이션 시 캐스팅 필요
- 트랜잭션 격리 수준: SQLite는 serializable, PostgreSQL은 default read committed
