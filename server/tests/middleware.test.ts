import { describe, it, expect, vi } from 'vitest'
import { authMiddleware, requireAuth } from '@/middleware/auth'
import { csrfMiddleware } from '@/middleware/csrf'
import { MemorySessionStore } from '@/sessions/memory'

function createRes() {
  return {
    statusCode: 200,
    _json: undefined as any,
    _cookies: {} as Record<string, string>,
    _cleared: [] as string[],
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(data: any) {
      this._json = data
      return this
    },
    cookie(name: string, value: string) {
      this._cookies[name] = value
      return this
    },
    clearCookie(name: string) {
      this._cleared.push(name)
      return this
    },
  }
}

describe('authMiddleware', () => {
  it('sid 쿠키로 세션을 복원하고 req.user를 설정하며 touch한다', async () => {
    const store = new MemorySessionStore()
    await store.set('sid1', { userId: 'u1', createdAt: 0, lastAccess: 0 }, 1000)
    const req: any = {
      cookies: { sid: 'sid1' },
      app: { locals: { sessionStore: store } },
    }
    const res: any = createRes()
    const next = vi.fn()
    await authMiddleware(req, res, next)
    expect(req.user?.id).toBe('u1')
    expect(next).toHaveBeenCalled()
    const session = await store.get('sid1')
    expect(session!.lastAccess).toBeGreaterThan(0)
  })

  it('쿠키가 없으면 익명으로 진행한다', async () => {
    const req: any = {
      cookies: {},
      app: { locals: { sessionStore: new MemorySessionStore() } },
    }
    const res: any = createRes()
    const next = vi.fn()
    await authMiddleware(req, res, next)
    expect(req.user).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })
})

describe('requireAuth', () => {
  it('인증 없으면 401', () => {
    const req: any = {}
    const res: any = createRes()
    const next = vi.fn()
    requireAuth(req, res, next)
    expect(res.statusCode).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('인증되면 next', () => {
    const req: any = { user: { id: 'u1' } }
    const res: any = createRes()
    const next = vi.fn()
    requireAuth(req, res, next)
    expect(next).toHaveBeenCalled()
  })
})

describe('csrfMiddleware', () => {
  it('GET 요청은 검증을 건너뛴다', async () => {
    const req: any = { method: 'GET', session: { csrfToken: 't', createdAt: 0, lastAccess: 0 } }
    const res: any = createRes()
    const next = vi.fn()
    await csrfMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('유효한 CSRF 토큰은 허용한다', async () => {
    const req: any = {
      method: 'POST',
      session: { csrfToken: 't', createdAt: 0, lastAccess: 0 },
      headers: { 'x-csrf-token': 't' },
    }
    const res: any = createRes()
    const next = vi.fn()
    await csrfMiddleware(req, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('CSRF 토큰이 없으면 403', async () => {
    const req: any = {
      method: 'POST',
      session: { csrfToken: 't', createdAt: 0, lastAccess: 0 },
      headers: {},
    }
    const res: any = createRes()
    const next = vi.fn()
    await csrfMiddleware(req, res, next)
    expect(res.statusCode).toBe(403)
    expect(next).not.toHaveBeenCalled()
  })
})
