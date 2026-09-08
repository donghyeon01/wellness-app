import { describe, it, expect, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { authMiddleware, requireAuth } from '@/middleware/auth'
import { csrfMiddleware } from '@/middleware/csrf'
import { MemorySessionStore } from '@/sessions/memory'

interface FakeResponse {
  statusCode: number
  body: unknown
  status(code: number): FakeResponse
  json(data: unknown): FakeResponse
}

function createRes(): FakeResponse {
  const res: FakeResponse = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(data: unknown) {
      this.body = data
      return this
    },
  }
  return res
}

function asRequest(req: Record<string, unknown>): Request {
  return req as unknown as Request
}

function asResponse(res: FakeResponse): Response {
  return res as unknown as Response
}

function asNext(next: () => void): NextFunction {
  return next as unknown as NextFunction
}

describe('authMiddleware', () => {
  it('sid 쿠키로 세션을 복원하고 req.user를 설정하며 touch한다', async () => {
    const store = new MemorySessionStore()
    await store.set('sid1', { userId: 'u1', createdAt: 0, lastAccess: 0 }, 1000)
    const req = asRequest({
      cookies: { sid: 'sid1' },
      app: { locals: { sessionStore: store } },
    })
    const res = createRes()
    const next = vi.fn()
    await authMiddleware(req, asResponse(res), asNext(next))
    expect(req.user?.id).toBe('u1')
    expect(next).toHaveBeenCalled()
    const session = await store.get('sid1')
    expect(session!.lastAccess).toBeGreaterThan(0)
  })

  it('쿠키가 없으면 익명으로 진행한다', async () => {
    const req = asRequest({
      cookies: {},
      app: { locals: { sessionStore: new MemorySessionStore() } },
    })
    const res = createRes()
    const next = vi.fn()
    await authMiddleware(req, asResponse(res), asNext(next))
    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })
})

describe('requireAuth', () => {
  it('인증 없으면 401', () => {
    const req = asRequest({})
    const res = createRes()
    const next = vi.fn()
    requireAuth(req, asResponse(res), asNext(next))
    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('인증되면 next', () => {
    const req = asRequest({ user: { id: 'u1' } })
    const res = createRes()
    const next = vi.fn()
    requireAuth(req, asResponse(res), asNext(next))
    expect(next).toHaveBeenCalled()
  })
})

describe('csrfMiddleware', () => {
  it('GET 요청은 검증을 건너뛴다', async () => {
    const req = asRequest({
      method: 'GET',
      session: { csrfToken: 't', createdAt: 0, lastAccess: 0 },
    })
    const res = createRes()
    const next = vi.fn()
    await csrfMiddleware(req, asResponse(res), asNext(next))
    expect(next).toHaveBeenCalled()
  })

  it('유효한 CSRF 토큰은 허용한다', async () => {
    const req = asRequest({
      method: 'POST',
      session: { csrfToken: 't', createdAt: 0, lastAccess: 0 },
      headers: { 'x-csrf-token': 't' },
    })
    const res = createRes()
    const next = vi.fn()
    await csrfMiddleware(req, asResponse(res), asNext(next))
    expect(next).toHaveBeenCalled()
  })

  it('CSRF 토큰이 없으면 403', async () => {
    const req = asRequest({
      method: 'POST',
      session: { csrfToken: 't', createdAt: 0, lastAccess: 0 },
      headers: {},
    })
    const res = createRes()
    const next = vi.fn()
    await csrfMiddleware(req, asResponse(res), asNext(next))
    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })
})
