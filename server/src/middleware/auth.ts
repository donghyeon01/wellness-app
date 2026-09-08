import { Request, Response, NextFunction } from 'express'
import { SessionStore } from '@/sessions/store'

const COOKIE_NAME = 'sid'
const TTL_SECONDS = 7 * 24 * 60 * 60

function getStore(req: Request): SessionStore {
  return req.app.locals.sessionStore as SessionStore
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sid = req.cookies[COOKIE_NAME]
    if (!sid) return next()

    const store = getStore(req)
    const session = await store.get(sid)
    if (session) {
      req.session = session
      if (session.userId) {
        req.user = { id: session.userId }
      }
      await store.touch(sid, TTL_SECONDS)
    }
    next()
  } catch (e) {
    next(e)
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: '인증이 필요합니다.' })
    return
  }
  next()
}
