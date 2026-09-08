import { Request, Response, NextFunction, Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import {
  MOODS,
  DiaryConflictError,
  listDiaries,
  getDiaryByDate,
  createDiary,
  updateDiary,
  deleteDiary,
} from '@/services/diary'
import type { Diary } from '@prisma/client'

const router = Router()

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.')

const monthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, '월은 YYYY-MM 형식이어야 합니다.')

const moodSchema = z.enum(MOODS, {
  message: '감정은 happy, neutral, sad, angry, anxious 중 하나여야 합니다.',
})

const createSchema = z.object({
  date: dateStringSchema,
  mood: moodSchema,
  content: z.string().min(1, '내용을 입력하세요.'),
})

const updateSchema = z
  .object({
    mood: moodSchema.optional(),
    content: z.string().min(1, '내용을 입력하세요.').optional(),
  })
  .refine((data) => data.mood !== undefined || data.content !== undefined, {
    message: '수정할 감정이나 내용을 입력하세요.',
  })

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

function asyncRoute(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}

function toApi(diary: Diary) {
  return {
    id: diary.id,
    userId: diary.userId,
    mood: diary.mood,
    content: diary.content,
    date: diary.date.toISOString().split('T')[0],
    createdAt: diary.createdAt.toISOString(),
    updatedAt: diary.updatedAt.toISOString(),
  }
}

router.get(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = monthSchema.safeParse(req.query.month)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const diaries = await listDiaries(req.user!.id, parsed.data)
    res.json({ diaries: diaries.map(toApi) })
  }),
)

router.get(
  '/:date',
  requireAuth,
  asyncRoute(async (req, res) => {
    const parsed = dateStringSchema.safeParse(req.params.date)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const diary = await getDiaryByDate(req.user!.id, parsed.data)
    res.json({ diary: diary ? toApi(diary) : null })
  }),
)

router.post(
  '/',
  requireAuth,
  asyncRoute(async (req, res, next) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    try {
      const diary = await createDiary(req.user!.id, parsed.data)
      res.status(201).json({ diary: toApi(diary) })
    } catch (e) {
      if (e instanceof DiaryConflictError) {
        res.status(409).json({ error: e.message })
        return
      }
      next(e)
    }
  }),
)

router.put(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = req.params.id
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const diary = await updateDiary(req.user!.id, id, parsed.data)
    if (!diary) {
      res.status(404).json({ error: '일기를 찾을 수 없습니다.' })
      return
    }

    res.json({ diary: toApi(diary) })
  }),
)

router.delete(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const id = req.params.id
    const diary = await deleteDiary(req.user!.id, id)
    if (!diary) {
      res.status(404).json({ error: '일기를 찾을 수 없습니다.' })
      return
    }

    res.json({ ok: true })
  }),
)

export default router
