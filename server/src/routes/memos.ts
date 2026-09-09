import { Request, Response, NextFunction, Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import {
  listMemos,
  getMemo,
  createMemo,
  updateMemo,
  deleteMemo,
} from '@/services/memo'

const router = Router()

const memoBodySchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(200, '제목은 200자 이하로 입력하세요.'),
  content: z.string().max(100_000, '내용은 100,000자 이하로 입력하세요.').default(''),
  category: z.string().max(50, '카테고리는 50자 이하로 입력하세요.').nullish(),
})

const updateMemoSchema = memoBodySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: '수정할 항목을 입력하세요.' })

const listQuerySchema = z.object({
  category: z.string().max(50, '카테고리는 50자 이하로 입력하세요.').optional(),
})

type AsyncHandler = (req: Request, res: Response, _next: NextFunction) => Promise<void>

function asyncRoute(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}

router.use(requireAuth)

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }
    const memos = await listMemos(req.user!.id, parsed.data.category)
    res.json({ memos })
  }),
)

router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const memo = await getMemo(req.user!.id, req.params.id)
    if (!memo) {
      res.status(404).json({ error: '메모를 찾을 수 없습니다.' })
      return
    }
    res.json({ memo })
  }),
)

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const parsed = memoBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }
    const memo = await createMemo(req.user!.id, parsed.data)
    res.status(201).json({ memo })
  }),
)

router.put(
  '/:id',
  asyncRoute(async (req, res) => {
    const parsed = updateMemoSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }
    const memo = await updateMemo(req.user!.id, req.params.id, parsed.data)
    if (!memo) {
      res.status(404).json({ error: '메모를 찾을 수 없습니다.' })
      return
    }
    res.json({ memo })
  }),
)

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const deleted = await deleteMemo(req.user!.id, req.params.id)
    if (!deleted) {
      res.status(404).json({ error: '메모를 찾을 수 없습니다.' })
      return
    }
    res.json({ ok: true })
  }),
)

export default router
