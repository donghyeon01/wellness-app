import { Request, Response, NextFunction, Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import * as eventService from '@/services/event'

const router = Router()

router.use(requireAuth)

type AsyncHandler = (req: Request, res: Response, _next: NextFunction) => Promise<void>

function asyncRoute(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}

function getUserId(req: Request, res: Response): string | null {
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ error: '인증이 필요합니다.' })
    return null
  }
  return userId
}

const dateValue = z.coerce.date({ invalid_type_error: '날짜 형식이 올바르지 않습니다.' })

const listQuerySchema = z.object({
  start: dateValue.optional(),
  end: dateValue.optional(),
})

const createEventSchema = z
  .object({
    title: z
      .string()
      .min(1, '제목을 입력하세요.')
      .max(200, '제목은 200자 이하로 입력하세요.'),
    description: z
      .string()
      .max(2000, '설명은 2000자 이하로 입력하세요.')
      .nullish(),
    start: dateValue,
    end: dateValue,
  })
  .refine((d) => d.start < d.end, {
    message: '종료 시각은 시작 시각보다 뒤여야 합니다.',
  })

const updateEventSchema = z.object({
  title: z
    .string()
    .min(1, '제목을 입력하세요.')
    .max(200, '제목은 200자 이하로 입력하세요.')
    .optional(),
  description: z
    .string()
    .max(2000, '설명은 2000자 이하로 입력하세요.')
    .nullish(),
  start: dateValue.optional(),
  end: dateValue.optional(),
})

// 월간 조회: ?start, ?end 쿼리로 범위를 지정한다. 없으면 전체 목록.
router.get(
  '/',
  asyncRoute(async (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const events = await eventService.listEvents(userId, parsed.data)
    res.json({ events })
  }),
)

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    const parsed = createEventSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const event = await eventService.createEvent(userId, parsed.data)
    res.status(201).json({ event })
  }),
)

router.put(
  '/:id',
  asyncRoute(async (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    // 부분 수정 허용: 변경되지 않은 start/end는 기존 값과 합쳐 start < end를 검증한다.
    const existing = await eventService.findEventById(req.params.id)
    if (!existing) {
      res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' })
      return
    }
    if (existing.userId !== userId) {
      res.status(403).json({ error: '이벤트에 대한 권한이 없습니다.' })
      return
    }

    const parsed = updateEventSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const mergedStart = parsed.data.start ?? existing.start
    const mergedEnd = parsed.data.end ?? existing.end
    if (!(mergedStart < mergedEnd)) {
      res.status(400).json({ error: '종료 시각은 시작 시각보다 뒤여야 합니다.' })
      return
    }

    const event = await eventService.updateEvent(userId, req.params.id, parsed.data)
    res.json({ event })
  }),
)

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const userId = getUserId(req, res)
    if (!userId) return

    const existing = await eventService.findEventById(req.params.id)
    if (!existing) {
      res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' })
      return
    }
    if (existing.userId !== userId) {
      res.status(403).json({ error: '이벤트에 대한 권한이 없습니다.' })
      return
    }

    await eventService.deleteEvent(userId, req.params.id)
    res.json({ ok: true })
  }),
)

export default router
