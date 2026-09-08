import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import http from 'node:http'
import type { Express } from 'express'
import { createApp } from '@/app'
import { prisma } from '@/lib/prisma'
import { MemorySessionStore } from '@/sessions/memory'
import { TestClient, startServer } from './helpers'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    memo: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

interface TestUser {
  id: string
  email: string
  password: string
  name: string
}

interface TestMemo {
  id: string
  userId: string
  title: string
  content: string
  category: string | null
  createdAt: Date
  updatedAt: Date
}

interface FindUniqueUserArgs {
  where: { id?: string; email?: string }
}

interface CreateUserArgs {
  data: { email: string; password: string; name: string }
}

interface FindManyMemoArgs {
  where: { userId: string; category?: string }
}

interface FindFirstMemoArgs {
  where: { id: string; userId: string }
}

interface CreateMemoArgs {
  data: { userId: string; title: string; content: string; category: string | null }
}

interface UpdateMemoArgs {
  where: { id: string }
  data: { title?: string; content?: string; category?: string | null }
}

interface DeleteMemoArgs {
  where: { id: string }
}

interface MemosBody {
  memos: TestMemo[]
}

interface MemoBody {
  memo: TestMemo
}

let app: Express
let server: http.Server
let port: number

const users: TestUser[] = []
let memos: TestMemo[] = []

function setupPrisma() {
  memos = []
  ;(prisma.user.create as unknown as Mock).mockImplementation(async (args: CreateUserArgs) => {
    const id = `u${users.length + 1}`
    const user: TestUser = { id, ...args.data }
    users.push(user)
    return { id: user.id, email: user.email, name: user.name }
  })
  ;(prisma.user.findUnique as unknown as Mock).mockImplementation(
    async (args: FindUniqueUserArgs) => {
      const { where } = args
      if (where.id) return users.find((u) => u.id === where.id) ?? null
      if (where.email) return users.find((u) => u.email === where.email) ?? null
      return null
    },
  )
  ;(prisma.memo.findMany as unknown as Mock).mockImplementation(
    async (args: FindManyMemoArgs) => {
      const { where } = args
      return memos
        .filter(
          (m) => m.userId === where.userId && (!where.category || m.category === where.category),
        )
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    },
  )
  ;(prisma.memo.findFirst as unknown as Mock).mockImplementation(
    async (args: FindFirstMemoArgs) => {
      const { where } = args
      return memos.find((m) => m.id === where.id && m.userId === where.userId) ?? null
    },
  )
  ;(prisma.memo.create as unknown as Mock).mockImplementation(async (args: CreateMemoArgs) => {
    const now = new Date()
    const memo: TestMemo = {
      id: `m${memos.length + 1}`,
      createdAt: now,
      updatedAt: now,
      ...args.data,
    }
    memos.push(memo)
    return memo
  })
  ;(prisma.memo.update as unknown as Mock).mockImplementation(async (args: UpdateMemoArgs) => {
    const memo = memos.find((m) => m.id === args.where.id)
    if (!memo) throw new Error('memo not found')
    Object.assign(memo, args.data, { updatedAt: new Date() })
    return memo
  })
  ;(prisma.memo.delete as unknown as Mock).mockImplementation(async (args: DeleteMemoArgs) => {
    const index = memos.findIndex((m) => m.id === args.where.id)
    if (index === -1) throw new Error('memo not found')
    const [memo] = memos.splice(index, 1)
    return memo
  })
}

async function registerUser(email: string, name: string): Promise<TestClient> {
  const client = new TestClient(port)
  let res = await client.request('GET', '/api/auth/csrf-token')
  client.parseCookies(res)
  res = await client.request('POST', '/api/auth/register', {
    email,
    password: 'Password1',
    name,
  })
  client.parseCookies(res)
  return client
}

beforeAll(async () => {
  app = createApp()
  const result = await startServer(app)
  server = result.server
  port = result.port
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  vi.clearAllMocks()
  users.length = 0
  ;(app.locals.sessionStore as MemorySessionStore).clear()
  setupPrisma()
})

describe('/api/memos', () => {
  it('인증 없이 GET /api/memos를 호출하면 401', async () => {
    const client = new TestClient(port)
    const res = await client.request('GET', '/api/memos')
    expect(res.status).toBe(401)
  })

  it('CSRF 토큰 없이 POST하면 403', async () => {
    const client = await registerUser('a@b.com', 'Alice')
    client.csrfToken = undefined
    const res = await client.request('POST', '/api/memos', {
      title: '메모',
      content: '내용',
    })
    expect(res.status).toBe(403)
  })

  it('메모를 생성하면 201과 메모를 반환한다', async () => {
    const client = await registerUser('a@b.com', 'Alice')
    const res = await client.request('POST', '/api/memos', {
      title: '첫 메모',
      content: '# 안녕',
      category: 'work',
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as MemoBody
    expect(body.memo.title).toBe('첫 메모')
    expect(body.memo.content).toBe('# 안녕')
    expect(body.memo.category).toBe('work')
  })

  it('제목 없이 생성하면 400', async () => {
    const client = await registerUser('a@b.com', 'Alice')
    const res = await client.request('POST', '/api/memos', {
      title: '',
      content: '내용',
    })
    expect(res.status).toBe(400)
  })

  it('본인 메모만 목록에 나오고 카테고리로 필터링된다', async () => {
    const alice = await registerUser('a@b.com', 'Alice')
    const bob = await registerUser('b@c.com', 'Bob')

    await alice.request('POST', '/api/memos', { title: 'A1', content: '', category: 'work' })
    await alice.request('POST', '/api/memos', { title: 'A2', content: '', category: 'life' })
    await bob.request('POST', '/api/memos', { title: 'B1', content: '', category: 'work' })

    let res = await alice.request('GET', '/api/memos')
    expect(res.status).toBe(200)
    let body = (await res.json()) as MemosBody
    expect(body.memos.map((m) => m.title).sort()).toEqual(['A1', 'A2'])

    res = await alice.request('GET', '/api/memos?category=work')
    body = (await res.json()) as MemosBody
    expect(body.memos.map((m) => m.title)).toEqual(['A1'])
  })

  it('단건 조회: 본인 메모는 200, 타인 메모는 404', async () => {
    const alice = await registerUser('a@b.com', 'Alice')
    const bob = await registerUser('b@c.com', 'Bob')

    const created = await alice.request('POST', '/api/memos', {
      title: 'A1',
      content: '내용',
    })
    const { memo } = (await created.json()) as MemoBody

    const res = await alice.request('GET', `/api/memos/${memo.id}`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as MemoBody
    expect(body.memo.title).toBe('A1')

    const forbidden = await bob.request('GET', `/api/memos/${memo.id}`)
    expect(forbidden.status).toBe(404)
  })

  it('수정: 본인 메모는 200, 타인 메모는 404', async () => {
    const alice = await registerUser('a@b.com', 'Alice')
    const bob = await registerUser('b@c.com', 'Bob')

    const created = await alice.request('POST', '/api/memos', {
      title: 'A1',
      content: '내용',
      category: 'work',
    })
    const { memo } = (await created.json()) as MemoBody

    const res = await alice.request('PUT', `/api/memos/${memo.id}`, {
      title: '수정됨',
      category: 'life',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as MemoBody
    expect(body.memo.title).toBe('수정됨')
    expect(body.memo.category).toBe('life')
    expect(body.memo.content).toBe('내용')

    const forbidden = await bob.request('PUT', `/api/memos/${memo.id}`, { title: 'X' })
    expect(forbidden.status).toBe(404)
  })

  it('삭제: 본인 메모는 삭제되고 타인 메모는 404', async () => {
    const alice = await registerUser('a@b.com', 'Alice')
    const bob = await registerUser('b@c.com', 'Bob')

    const created = await alice.request('POST', '/api/memos', {
      title: 'A1',
      content: '내용',
    })
    const { memo } = (await created.json()) as MemoBody

    const forbidden = await bob.request('DELETE', `/api/memos/${memo.id}`)
    expect(forbidden.status).toBe(404)

    const res = await alice.request('DELETE', `/api/memos/${memo.id}`)
    expect(res.status).toBe(200)

    const gone = await alice.request('GET', `/api/memos/${memo.id}`)
    expect(gone.status).toBe(404)
  })

  it('존재하지 않는 메모 조회/수정/삭제는 404', async () => {
    const client = await registerUser('a@b.com', 'Alice')
    expect((await client.request('GET', '/api/memos/nope')).status).toBe(404)
    expect((await client.request('PUT', '/api/memos/nope', { title: 'X' })).status).toBe(404)
    expect((await client.request('DELETE', '/api/memos/nope')).status).toBe(404)
  })
})
