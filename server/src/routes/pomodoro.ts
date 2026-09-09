import { Request, Response, NextFunction, Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import {
  createPomodoroSession,
  listPomodoroSessions,
  getPomodoroStats,
  PomodoroSessionInput,
} from '@/services/pomodoro'

const router = Router()

const rangeSchema = z.enum(['day', 'week', 'month'])

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
const dateStringSchema = z
  .string()
  .regex(isoDateRegex, 'yyyy-mm-dd 형식의 날짜를 입력하세요.')
  .default(() => new Date().toISOString().slice(0, 10))

const sessionsQuerySchema = z.object({
  range: rangeSchema.default('day'),
  date: dateStringSchema,
})

const statsQuerySchema = z.object({
  range: rangeSchema.default('day'),
  date: dateStringSchema,
})

const createSessionBodySchema = z.object({
  duration: z.coerce.number().int().positive().optional(),
  type: z.enum(['focus', 'break']),
})

type AsyncHandler = (req: Request, res: Response, _next: NextFunction) => Promise<void>

function asyncRoute(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}

router.get(
  '/sessions',
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = req.user!.id
    const parsed = sessionsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const { range, date } = parsed.data
    const sessions = await listPomodoroSessions(userId, range, date)
    res.json({ sessions })
  }),
)

router.post(
  '/sessions',
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = req.user!.id
    const parsed = createSessionBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const input: PomodoroSessionInput = {
      duration: parsed.data.duration,
      type: parsed.data.type,
    }

    const session = await createPomodoroSession(userId, input)
    res.status(201).json({ session })
  }),
)

router.get(
  '/stats',
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = req.user!.id
    const parsed = statsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const { range, date } = parsed.data
    const stats = await getPomodoroStats(userId, range, date)
    res.json(stats)
  }),
)

export default router
