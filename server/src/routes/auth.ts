import { Request, Response, NextFunction, Router } from 'express'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { hashPassword, verifyPassword, passwordSchema } from '@/services/auth/password'
import { createCsrfToken } from '@/services/auth/csrf'
import { prisma } from '@/lib/prisma'
import { SessionStore } from '@/sessions/store'
import { requireAuth } from '@/middleware/auth'

const router = Router()

const TTL_SECONDS = 7 * 24 * 60 * 60

const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: passwordSchema,
  name: z.string().min(1, '이름을 입력하세요.').max(100, '이름은 100자 이하로 입력하세요.'),
})

const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
})

function getStore(req: Request): SessionStore {
  return req.app.locals.sessionStore as SessionStore
}

function getSid(req: Request): string | undefined {
  return req.cookies.sid
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: TTL_SECONDS * 1000,
    path: '/',
  }
}

function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: TTL_SECONDS * 1000,
    path: '/',
  }
}

type AsyncHandler = (req: Request, res: Response, _next: NextFunction) => Promise<void>

function asyncRoute(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}

router.post(
  '/register',
  asyncRoute(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const { email, password, name } = parsed.data
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: '이미 가입된 이메일입니다.' })
      return
    }

    const hash = await hashPassword(password)
    const user = await prisma.user.create({
      data: { email, password: hash, name },
      select: { id: true, email: true, name: true },
    })

    const sid = getSid(req) ?? randomUUID()
    await createCsrfToken(sid, getStore(req))
    const session = (await getStore(req).get(sid))!
    session.userId = user.id
    session.lastAccess = Date.now()
    await getStore(req).set(sid, session, TTL_SECONDS)

    res.cookie('sid', sid, sessionCookieOptions())
    res.cookie('csrf-token', session.csrfToken!, csrfCookieOptions())
    res.status(201).json({ user })
  }),
)

router.post(
  '/login',
  asyncRoute(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const { email, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await verifyPassword(user.password, password))) {
      res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' })
      return
    }

    const sid = getSid(req) ?? randomUUID()
    await createCsrfToken(sid, getStore(req))
    const session = (await getStore(req).get(sid))!
    session.userId = user.id
    session.lastAccess = Date.now()
    await getStore(req).set(sid, session, TTL_SECONDS)

    res.cookie('sid', sid, sessionCookieOptions())
    res.cookie('csrf-token', session.csrfToken!, csrfCookieOptions())
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
    })
  }),
)

router.post(
  '/logout',
  requireAuth,
  asyncRoute(async (req, res) => {
    const sid = getSid(req)
    if (sid) {
      await getStore(req).delete(sid)
    }
    res.clearCookie('sid', { httpOnly: true, sameSite: 'lax', path: '/' })
    res.clearCookie('csrf-token', { sameSite: 'lax', path: '/' })
    res.json({ ok: true })
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncRoute(async (req, res) => {
    if (!req.user?.id) {
      res.status(401).json({ error: '인증이 필요합니다.' })
      return
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true },
    })
    if (!user) {
      res.status(401).json({ error: '사용자를 찾을 수 없습니다.' })
      return
    }
    res.json({ user })
  }),
)

router.get(
  '/csrf-token',
  asyncRoute(async (req, res) => {
    const store = getStore(req)
    const sid = getSid(req) ?? randomUUID()
    const token = await createCsrfToken(sid, store)
    res.cookie('sid', sid, sessionCookieOptions())
    res.cookie('csrf-token', token, csrfCookieOptions())
    res.json({ csrfToken: token })
  }),
)

export default router
