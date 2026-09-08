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
    pomodoroSession: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    userSettings: {
      findUnique: vi.fn(),
    },
  },
}))

interface TestUser {
  id: string
  email: string
  password: string
  name: string
}

interface CreateArgs {
  data: { email: string; password: string; name: string }
}

let app: Express
let server: http.Server
let port: number
let sessionCounter = 0

function setupPrisma() {
  const users: TestUser[] = []
  const settings: Record<string, { pomodoroFocus: number; pomodoroBreak: number }> = {}
  const sessions: Array<{ id: string; userId: string; duration: number; type: string; completedAt: Date }> = []

  ;(prisma.user.create as unknown as Mock).mockImplementation(async (args: CreateArgs) => {
    const id = `u${users.length + 1}`
    const user: TestUser = { id, ...args.data }
    users.push(user)
    settings[id] = { pomodoroFocus: 1500, pomodoroBreak: 300 }
    return { id: user.id, email: user.email, name: user.name }
  })

  ;(prisma.user.findUnique as unknown as Mock).mockImplementation(
    async ({ where }: { where: { id?: string; email?: string } }) => {
      if (where.id) return users.find((u) => u.id === where.id) ?? null
      if (where.email) return users.find((u) => u.email === where.email) ?? null
      return null
    },
  )

  ;(prisma.userSettings.findUnique as unknown as Mock).mockImplementation(
    async ({ where }: { where: { userId: string } }) => {
      return settings[where.userId] ?? null
    },
  )

  ;(prisma.pomodoroSession.create as unknown as Mock).mockImplementation(
    async (args: { data: { userId: string; duration: number; type: string } }) => {
      sessionCounter += 1
      const session = {
        id: `ps${sessionCounter}`,
        ...args.data,
        completedAt: new Date(),
      }
      sessions.push(session)
      return session
    },
  )

  ;(prisma.pomodoroSession.findMany as unknown as Mock).mockImplementation(
    async (args: { where: { userId: string; completedAt?: { gte: Date; lt: Date }; type?: string } }) => {
      let result = sessions.filter((s) => s.userId === args.where.userId)

      if (args.where.completedAt) {
        const { gte, lt } = args.where.completedAt
        result = result.filter((s) => s.completedAt >= gte && s.completedAt < lt)
      }

      if (args.where.type) {
        result = result.filter((s) => s.type === args.where!.type)
      }

      return [...result].sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
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
  sessionCounter = 0
  setupPrisma()
})

async function registerAndLogin(client: TestClient) {
  let res = await client.request('GET', '/api/auth/csrf-token')
  client.parseCookies(res)

  res = await client.request('POST', '/api/auth/register', {
    email: 'pomodoro@example.com',
    password: 'Password1',
    name: 'Pomodoro',
  })
  expect(res.status).toBe(201)
  client.parseCookies(res)
}

describe('/api/pomodoro', () => {
  it('GET /sessions는 인증 없이 접근하면 401', async () => {
    const client = new TestClient(port)
    const res = await client.request('GET', '/api/pomodoro/sessions')
    expect(res.status).toBe(401)
  })

  it('POST /sessions는 CSRF 토큰이 없으면 403', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)
    client.csrfToken = undefined
    const res = await client.request('POST', '/api/pomodoro/sessions', { type: 'focus' })
    expect(res.status).toBe(403)
  })

  it('POST /sessions로 집중 세션을 저장한다', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    const res = await client.request('POST', '/api/pomodoro/sessions', {
      duration: 1500,
      type: 'focus',
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { session: { duration: number; type: string } }
    expect(body.session.duration).toBe(1500)
    expect(body.session.type).toBe('focus')
  })

  it('POST /sessions에 duration을 생략하면 UserSettings 기본값을 사용한다', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    const res = await client.request('POST', '/api/pomodoro/sessions', { type: 'break' })
    expect(res.status).toBe(201)
    const body = (await res.json()) as { session: { duration: number; type: string } }
    expect(body.session.duration).toBe(300)
    expect(body.session.type).toBe('break')
  })

  it('GET /sessions로 오늘 세션 목록을 조회한다', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    await client.request('POST', '/api/pomodoro/sessions', { duration: 1500, type: 'focus' })
    await client.request('POST', '/api/pomodoro/sessions', { duration: 300, type: 'break' })

    const res = await client.request('GET', '/api/pomodoro/sessions')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { sessions: Array<{ type: string }> }
    expect(body.sessions).toHaveLength(2)
  })

  it('GET /stats?range=day로 오늘 집중 통계를 조회한다', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    await client.request('POST', '/api/pomodoro/sessions', { duration: 1500, type: 'focus' })
    await client.request('POST', '/api/pomodoro/sessions', { duration: 900, type: 'focus' })
    await client.request('POST', '/api/pomodoro/sessions', { duration: 300, type: 'break' })

    const res = await client.request('GET', '/api/pomodoro/stats?range=day')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { totalSeconds: number; count: number }
    expect(body.totalSeconds).toBe(2400)
    expect(body.count).toBe(2)
  })

  it('GET /stats?range=week&date=2026-09-09로 주간 통계를 조회한다', async () => {
    const client = new TestClient(port)
    await registerAndLogin(client)

    await client.request('POST', '/api/pomodoro/sessions', { duration: 1500, type: 'focus' })

    const res = await client.request('GET', '/api/pomodoro/stats?range=week&date=2026-09-09')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { totalSeconds: number; count: number }
    expect(body.count).toBe(1)
    expect(body.totalSeconds).toBe(1500)
  })
})
