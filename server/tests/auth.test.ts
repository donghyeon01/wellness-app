import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import http from 'node:http'
import { createApp } from '@/app'
import { prisma } from '@/lib/prisma'
import { TestClient, startServer } from './helpers'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

let app: any
let server: http.Server
let port: number

function setupPrisma() {
  const users: any[] = []
  ;(prisma.user.create as any).mockImplementation(async ({ data }: any) => {
    const id = `u${users.length + 1}`
    const user = { id, ...data }
    users.push(user)
    return { ...user }
  })
  ;(prisma.user.findUnique as any).mockImplementation(async ({ where }: any) => {
    if (where?.id) return users.find((u) => u.id === where.id) ?? null
    if (where?.email) return users.find((u) => u.email === where.email) ?? null
    return null
  })
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
  ;(app.locals.sessionStore as any).clear()
  setupPrisma()
})

describe('/api/auth', () => {
  it('GET /csrf-token은 세션과 CSRF 토큰 쿠키를 발급한다', async () => {
    const client = new TestClient(port)
    const res = await client.request('GET', '/api/auth/csrf-token')
    expect(res.status).toBe(200)
    const body = await res.json()
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
    const body = await res.json()
    expect(body.user.email).toBe('a@b.com')
    client.parseCookies(res)

    const meRes = await client.request('GET', '/api/auth/me')
    expect(meRes.status).toBe(200)
    const me = await meRes.json()
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
    const body = await res.json()
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
