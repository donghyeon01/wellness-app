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
  },
}))

interface TestUser {
  id: string
  email: string
  password: string
  name: string
}

interface FindUniqueArgs {
  where: { id?: string; email?: string }
}

interface CreateArgs {
  data: { email: string; password: string; name: string }
}

interface UserBody {
  user: { id: string; email: string; name: string }
}

interface CsrfBody {
  csrfToken: string
}

let app: Express
let server: http.Server
let port: number

function setupPrisma() {
  const users: TestUser[] = []
  ;(prisma.user.create as unknown as Mock).mockImplementation(async (args: CreateArgs) => {
    const id = `u${users.length + 1}`
    const user: TestUser = { id, ...args.data }
    users.push(user)
    return { id: user.id, email: user.email, name: user.name }
  })
  ;(prisma.user.findUnique as unknown as Mock).mockImplementation(
    async (args: FindUniqueArgs) => {
      const { where } = args
      if (where.id) return users.find((u) => u.id === where.id) ?? null
      if (where.email) return users.find((u) => u.email === where.email) ?? null
      return null
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

describe('/api/auth', () => {
  it('GET /csrf-token은 세션과 CSRF 토큰 쿠키를 발급한다', async () => {
    const client = new TestClient(port)
    const res = await client.request('GET', '/api/auth/csrf-token')
    expect(res.status).toBe(200)
    const body = (await res.json()) as CsrfBody
    client.parseCookies(res)
    expect(client.cookies['sid']).toBeDefined()
    expect(client.cookies['csrf-token']).toBe(body.csrfToken)
  })

  it('POST /register에 CSRF 토큰이 없으면 403', async () => {
    const client = new TestClient(port)
    const res = await client.request('POST', '/api/auth/register', {
      email: 'a@b.com',
      password: 'Password1',
      name: 'Alice',
    })
    expect(res.status).toBe(403)
  })

  it('약한 비밀번호로 가입하면 400', async () => {
    const client = new TestClient(port)
    const csrfRes = await client.request('GET', '/api/auth/csrf-token')
    client.parseCookies(csrfRes)
    const res = await client.request('POST', '/api/auth/register', {
      email: 'a@b.com',
      password: 'short1',
      name: 'Alice',
    })
    expect(res.status).toBe(400)
  })

  it('POST /register로 가입하면 인증된 상태가 된다', async () => {
    const client = new TestClient(port)
    const csrfRes = await client.request('GET', '/api/auth/csrf-token')
    client.parseCookies(csrfRes)

    const res = await client.request('POST', '/api/auth/register', {
      email: 'a@b.com',
      password: 'Password1',
      name: 'Alice',
    })
    expect(res.status).toBe(201)
    const body = (await res.json()) as UserBody
    expect(body.user.email).toBe('a@b.com')
    client.parseCookies(res)

    const meRes = await client.request('GET', '/api/auth/me')
    expect(meRes.status).toBe(200)
    const me = (await meRes.json()) as UserBody
    expect(me.user.email).toBe('a@b.com')
  })

  it('잘못된 비밀번호로 로그인하면 401', async () => {
    const client = new TestClient(port)
    let res = await client.request('GET', '/api/auth/csrf-token')
    client.parseCookies(res)

    res = await client.request('POST', '/api/auth/register', {
      email: 'a@b.com',
      password: 'Password1',
      name: 'Alice',
    })
    client.parseCookies(res)

    res = await client.request('POST', '/api/auth/login', {
      email: 'a@b.com',
      password: 'WrongPass1',
    })
    expect(res.status).toBe(401)
  })

  it('올바른 정보로 로그인하고 /me를 조회한다', async () => {
    const client = new TestClient(port)
    let res = await client.request('GET', '/api/auth/csrf-token')
    client.parseCookies(res)

    res = await client.request('POST', '/api/auth/register', {
      email: 'a@b.com',
      password: 'Password1',
      name: 'Alice',
    })
    client.parseCookies(res)

    res = await client.request('POST', '/api/auth/login', {
      email: 'a@b.com',
      password: 'Password1',
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as UserBody
    expect(body.user.email).toBe('a@b.com')
    client.parseCookies(res)

    const meRes = await client.request('GET', '/api/auth/me')
    expect(meRes.status).toBe(200)
  })

  it('인증 없이 /me를 조회하면 401', async () => {
    const client = new TestClient(port)
    const res = await client.request('GET', '/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('로그아웃하면 쿠키가 만료되고 이후 /me는 401', async () => {
    const client = new TestClient(port)
    let res = await client.request('GET', '/api/auth/csrf-token')
    client.parseCookies(res)

    res = await client.request('POST', '/api/auth/register', {
      email: 'a@b.com',
      password: 'Password1',
      name: 'Alice',
    })
    client.parseCookies(res)

    res = await client.request('POST', '/api/auth/logout')
    expect(res.status).toBe(200)
    client.parseCookies(res)
    expect(client.cookies['sid']).toBeNull()
    expect(client.cookies['csrf-token']).toBeNull()

    res = await client.request('GET', '/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('인증 없이 로그아웃하면 401', async () => {
    const client = new TestClient(port)
    let res = await client.request('GET', '/api/auth/csrf-token')
    client.parseCookies(res)

    res = await client.request('POST', '/api/auth/logout')
    expect(res.status).toBe(401)
  })
})
