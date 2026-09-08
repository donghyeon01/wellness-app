import { Request, Response, NextFunction, Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '@/middleware/auth'
import {
  createTodo,
  getTodo,
  getTodos,
  updateTodo,
  deleteTodo,
  createTodoSchema,
  updateTodoSchema,
} from '@/services/todo'

const router = Router()

type AsyncHandler = (req: Request, res: Response, _next: NextFunction) => Promise<void>

function asyncRoute(handler: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next)
  }
}

const listQuerySchema = z.object({
  completed: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  priority: z.coerce.number().int().min(0).max(2).optional(),
})

/**
 * GET /api/todos
 * 본인 TODO 목록 조회. completed/priority 쿼리 필터 지원.
 */
router.get(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = req.user!.id
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const { completed, priority } = parsed.data
    const todos = await getTodos(userId, { completed, priority })
    res.json({ todos })
  }),
)

/**
 * GET /api/todos/:id
 * 본인 TODO 단건 조회.
 */
router.get(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = req.user!.id
    const todo = await getTodo(userId, req.params.id)
    if (!todo) {
      res.status(404).json({ error: 'TODO를 찾을 수 없습니다.' })
      return
    }
    res.json({ todo })
  }),
)

/**
 * POST /api/todos
 * TODO 생성. priority는 0~2, dueDate 선택.
 */
router.post(
  '/',
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = req.user!.id
    const parsed = createTodoSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const todo = await createTodo(userId, parsed.data)
    res.status(201).json({ todo })
  }),
)

/**
 * PUT /api/todos/:id
 * TODO 수정. 본인 TODO만 가능.
 */
router.put(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = req.user!.id
    const parsed = updateTodoSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const todo = await updateTodo(userId, req.params.id, parsed.data)
    if (!todo) {
      res.status(404).json({ error: 'TODO를 찾을 수 없습니다.' })
      return
    }
    res.json({ todo })
  }),
)

/**
 * DELETE /api/todos/:id
 * TODO 삭제. 본인 TODO만 가능.
 */
router.delete(
  '/:id',
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = req.user!.id
    const todo = await deleteTodo(userId, req.params.id)
    if (!todo) {
      res.status(404).json({ error: 'TODO를 찾을 수 없습니다.' })
      return
    }
    res.json({ todo })
  }),
)

export default router
