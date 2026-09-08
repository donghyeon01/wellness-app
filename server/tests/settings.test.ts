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
    userSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

interface TestSettings {
  userId: string
  theme: string
}

interface FindUniqueArgs {
  where: { userId: string }
  select?: { theme?: boolean }
}

interface UpsertArgs {
  where: { userId: string }
  create: { userId: string; theme: string }
  update: { theme: string }
}

let app: Express
let server: http.Server
let port: number

function setupPrisma() {
  const settingsByUser = new Map<string, TestSettings>()

  ;(prisma.userSettings.findUnique as unknown as Mock).mockImplementation(
    async (args: FindUniqueArgs) => {
      const stored = settingsByUser.get(args.where.userId)
      if (!stored) return null
      return { theme: stored.theme }
    },
  )

  ;(prisma.userSettings.upsert as unknown as Mock).mockImplementation(
    async (args: UpsertArgs) => {
      const existing = settingsByUser.get(args.where.userId)
      if (existing) {
        existing.theme = args.update.theme
      } else {
        settingsByUser.set(args.where.userId, {
          userId: args.where.userId,
          theme: args.create.theme,
        })
      }
      return settingsByUser.get(args.where.userId)
    },
  )
}

function createSession(client: TestClient, userId: string, token: string): string {
  const sid = `session-${userId}`
  const store = app.locals.sessionStore as MemorySessionStore
  const ttl = 7 * 24 * 60 * 60
  store.set(sid, { userId, csrfToken: token, createdAt: Date.now(), lastAccess: Date.now() }, ttl)
  client.cookies['sid'] = sid
  client.cookies['csrf-token'] = token
  client.csrfToken = token
  return sid
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

describe('/api/settings', () => {
  it('GET /api/settings은 인증 없이 401을 반환한다', async () => {
    const client = new TestClient(port)
    const res = await client.request('GET', '/api/settings')
    expect(res.status).toBe(401)
  })

  it('GET /api/settings은 저장된 테마를 반환한다', async () => {
    const client = new TestClient(port)
    createSession(client, 'u1', 'token-1')

    const res = await client.request('GET', '/api/settings')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { settings: { theme: string } }
    expect(body.settings.theme).toBe('system')
  })

  it('PUT /api/settings은 CSRF 토큰이 없으면 403을 반환한다', async () => {
    const client = new TestClient(port)
    createSession(client, 'u1', 'token-1')
    client.csrfToken = undefined

    const res = await client.request('PUT', '/api/settings', { theme: 'dark' })
    expect(res.status).toBe(403)
  })

  it('PUT /api/settings은 테마를 변경한다', async () => {
    const client = new TestClient(port)
    createSession(client, 'u1', 'token-1')

    const res = await client.request('PUT', '/api/settings', { theme: 'dark' })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { settings: { theme: string } }
    expect(body.settings.theme).toBe('dark')

    const getRes = await client.request('GET', '/api/settings')
    const getBody = (await getRes.json()) as { settings: { theme: string } }
    expect(getBody.settings.theme).toBe('dark')
  })

  it('PUT /api/settings에 잘못된 테마 값이면 400을 반환한다', async () => {
    const client = new TestClient(port)
    createSession(client, 'u1', 'token-1')

    const res = await client.request('PUT', '/api/settings', { theme: 'red' })
    expect(res.status).toBe(400)
  })
})
