import { Request, Response, NextFunction } from 'express'
import { verifyCsrfToken } from '@/services/auth/csrf'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE'])

export async function csrfMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!MUTATION_METHODS.has(req.method)) return next()

  try {
    const ok = await verifyCsrfToken(
      req.session,
      req.headers['x-csrf-token'] as string | undefined,
    )
    if (ok) return next()
    res.status(403).json({ error: 'CSRF 토큰이 누락되었거나 올바르지 않습니다.' })
  } catch (e) {
    next(e)
  }
}
