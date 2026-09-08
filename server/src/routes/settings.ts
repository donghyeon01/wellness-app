import { Request, Response, NextFunction, Router } from 'express'
import { requireAuth } from '@/middleware/auth'
import { getSettings, updateSettings } from '@/services/settings'

type AsyncHandler = (req: Request, res: Response, _next: NextFunction) => Promise<void>

function asyncRoute(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}

const router = Router()

router.get(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const settings = await getSettings(req.user!.id)
    res.json({ settings })
  }),
)

router.put(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    try {
      const settings = await updateSettings(req.user!.id, req.body)
      res.json({ settings })
    } catch (e) {
      const message = e instanceof Error ? e.message : '잘못된 요청입니다.'
      res.status(400).json({ error: message })
    }
  }),
)

export default router
