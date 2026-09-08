import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { Prisma } from '@prisma/client'
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
    diary: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

interface TestDiary {
  id: string
  userId: string
  mood: string
  content: string
  date: Date
  createdAt: Date
  updatedAt: Date
}

let app: Express
let server: http.Server
let port: number

function setupPrisma() {
  const users: TestUser[] = []
  const diaries: TestDiary[] = []

  ;(prisma.user.create as unknown as Mock).mockImplementation(
    async (args: { data: { email: string; password: string; name: string } }) => {
      const id = `u${users.length + 1}`
      const user: TestUser = { id, ...args.data }
      users.push(user)
      return { id: user.id, email: user.email, name: user.name }
    },
  )

  ;(prisma.user.findUnique as unknown as Mock).mockImplementation(
    async (args: { where: { id?: string; email?: string } }) => {
      const { where } = args
      if (where.id) return users.find((u) => u.id === where.id) ?? null
      if (where.email) return users.find((u) => u.email === where.email) ?? null
      return null
    },
  )

  ;(prisma.diary.findMany as unknown as Mock).mockImplementation(
    async (args: { where: { userId: string; date: { gte: Date; lt: Date } }; orderBy?: unknown }) => {
      const { userId, date } = args.where
      const filtered = diaries.filter(
        (d) => d.userId === userId && d.date.getTime() >= date.gte.getTime() && d.date.getTime() < date.lt.getTime(),
      )
      return filtered.sort((a, b) => a.date.getTime() - b.date.getTime())
    },
  )

  ;(prisma.diary.findUnique as unknown as Mock).mockImplementation(
    async (args: { where: { id?: string; userId_date?: { userId: string; date: Date } } }) => {
      const { where } = args
      if (where.id) return diaries.find((d) => d.id === where.id) ?? null
      if (where.userId_date) {
        return (
          diaries.find(
            (d) =>
              d.userId === where.userId_date?.userId &&
              d.date.getTime() === where.userId_date?.date.getTime(),
          ) ?? null
        )
      }
      return null
    },
  )

  ;(prisma.diary.create as unknown as Mock).mockImplementation(
    async (args: { data: { userId: string; mood: string; content: string; date: Date } }) => {
      const { userId, date } = args.data
      const existing = diaries.find((d) => d.userId === userId && d.date.getTime() === date.getTime())
      if (existing) {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: Prisma.prismaVersion.client,
        })
      }

      const id = `d${diaries.length + 1}`
      const now = new Date()
      const diary: TestDiary = { id, ...args.data, createdAt: now, updatedAt: now }
      diaries.push(diary)
      return diary
    },
  )

  ;(prisma.diary.update as unknown as Mock).mockImplementation(
    async (args: { where: { id: string }; data: { mood?: string; content?: string } }) => {
      const index = diaries.findIndex((d) => d.id === args.where.id)
      if (index === -1) {
        throw new Prisma.PrismaClientKnownRequestError('Record to update not found', {
          code: 'P2025',
          clientVersion: Prisma.prismaVersion.client,
        })
      }

      const now = new Date()
      const updated = { ...diaries[index], ...args.data, updatedAt: now }
      diaries[index] = updated
      return updated
    },
  )

  ;(prisma.diary.delete as unknown as Mock).mockImplementation(
    async (args: { where: { id: string } }) => {
      const index = diaries.findIndex((d) => d.id === args.where.id)
      if (index === -1) {
        throw new Prisma.PrismaClientKnownRequestError('Record to delete not found', {
          code: 'P2025',
          clientVersion: Prisma.prismaVersion.client,
        })
      }
      const [deleted] = diaries.splice(index, 1)
      return deleted
    },
  )
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
  ;(app.locals.sessionStore as MemorySessionStore).clear()
  setupPrisma()
})

describe('/api/diaries', () => {
  async function register(client: TestClient) {
    const csrfRes = await client.request('GET', '/api/auth/csrf-token')
    client.parseCookies(csrfRes)

    const res = await client.request('POST', '/api/auth/register', {
      email: 'a@b.com',
      password: 'Password1',
      name: 'Alice',
    })
    expect(res.status).toBe(201)
    client.parseCookies(res)
  }

  it('인증 없이 조회하면 401', async () => {
    const client = new TestClient(port)
    const res = await client.request('GET', '/api/diaries?month=2024-09')
    expect(res.status).toBe(401)
  })

  it('월간 목록을 조회한다', async () => {
    const client = new TestClient(port)
    await register(client)

    await client.request('POST', '/api/diaries', {
      date: '2024-09-01',
      mood: 'happy',
      content: '좋은 하루',
    })
    await client.request('POST', '/api/diaries', {
      date: '2024-09-10',
      mood: 'sad',
      content: '힘든 하루',
    })

    const res = await client.request('GET', '/api/diaries?month=2024-09')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { diaries: { date: string; mood: string }[] }
    expect(body.diaries).toHaveLength(2)
    expect(body.diaries[0].date).toBe('2024-09-01')
    expect(body.diaries[1].mood).toBe('sad')
  })

  it('날짜별 단건을 조회하고 없으면 null을 반환한다', async () => {
    const client = new TestClient(port)
    await register(client)

    const res = await client.request('GET', '/api/diaries/2024-09-09')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { diary: null }
    expect(body.diary).toBeNull()

    const postRes = await client.request('POST', '/api/diaries', {
      date: '2024-09-09',
      mood: 'neutral',
      content: '보통',
    })
    expect(postRes.status).toBe(201)

    const getRes = await client.request('GET', '/api/diaries/2024-09-09')
    const getBody = (await getRes.json()) as { diary: { date: string; mood: string } }
    expect(getRes.status).toBe(200)
    expect(getBody.diary.date).toBe('2024-09-09')
    expect(getBody.diary.mood).toBe('neutral')
  })

  it('일기를 생성한다', async () => {
    const client = new TestClient(port)
    await register(client)

    const res = await client.request('POST', '/api/diaries', {
      date: '2024-09-15',
      mood: 'happy',
      content: '생성 테스트',
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { diary: { mood: string; content: string } }
    expect(body.diary.mood).toBe('happy')
    expect(body.diary.content).toBe('생성 테스트')
  })

  it('같은 날짜에 두 번 생성하면 409', async () => {
    const client = new TestClient(port)
    await register(client)

    const first = await client.request('POST', '/api/diaries', {
      date: '2024-09-15',
      mood: 'happy',
      content: '첫 번째',
    })
    expect(first.status).toBe(201)

    const second = await client.request('POST', '/api/diaries', {
      date: '2024-09-15',
      mood: 'neutral',
      content: '두 번째',
    })
    expect(second.status).toBe(409)
  })

  it('허용되지 않은 mood로 생성하면 400', async () => {
    const client = new TestClient(port)
    await register(client)

    const res = await client.request('POST', '/api/diaries', {
      date: '2024-09-15',
      mood: 'excited',
      content: '기분',
    })
    expect(res.status).toBe(400)
  })

  it('일기를 수정한다', async () => {
    const client = new TestClient(port)
    await register(client)

    const createRes = await client.request('POST', '/api/diaries', {
      date: '2024-09-20',
      mood: 'sad',
      content: '수정 전',
    })
    const { diary } = (await createRes.json()) as { diary: { id: string } }

    const updateRes = await client.request('PUT', `/api/diaries/${diary.id}`, {
      mood: 'happy',
      content: '수정 후',
    })
    expect(updateRes.status).toBe(200)
    const body = (await updateRes.json()) as { diary: { mood: string; content: string } }
    expect(body.diary.mood).toBe('happy')
    expect(body.diary.content).toBe('수정 후')
  })

  it('존재하지 않는 일기를 수정하면 404', async () => {
    const client = new TestClient(port)
    await register(client)

    const res = await client.request('PUT', '/api/diaries/nonexistent', {
      mood: 'happy',
      content: '내용',
    })
    expect(res.status).toBe(404)
  })

  it('일기를 삭제한다', async () => {
    const client = new TestClient(port)
    await register(client)

    const createRes = await client.request('POST', '/api/diaries', {
      date: '2024-09-25',
      mood: 'angry',
      content: '삭제할 일기',
    })
    const { diary } = (await createRes.json()) as { diary: { id: string } }

    const deleteRes = await client.request('DELETE', `/api/diaries/${diary.id}`)
    expect(deleteRes.status).toBe(200)

    const getRes = await client.request('GET', '/api/diaries/2024-09-25')
    const body = (await getRes.json()) as { diary: null }
    expect(body.diary).toBeNull()
  })

  it('존재하지 않는 일기를 삭제하면 404', async () => {
    const client = new TestClient(port)
    await register(client)

    const res = await client.request('DELETE', '/api/diaries/nonexistent')
    expect(res.status).toBe(404)
  })
})
