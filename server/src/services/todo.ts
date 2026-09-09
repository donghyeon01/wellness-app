import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const prioritySchema = z
  .number({ invalid_type_error: '우선순위는 0~2 사이여야 합니다.' })
  .int('우선순위는 0~2 사이여야 합니다.')
  .min(0, '우선순위는 0~2 사이여야 합니다.')
  .max(2, '우선순위는 0~2 사이여야 합니다.')

/**
 * ISO 문자열, 날짜만 있는 문자열, null, undefined, 빈 문자열을 Date | null 로 파싱한다.
 * 유효하지 않은 날짜는 400 오류로 처리한다.
 */
const dueDateSchema = z
  .preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return null
      if (val instanceof Date) return val
      const d = new Date(String(val))
      if (Number.isNaN(d.getTime())) return undefined
      return d
    },
    z.date().nullable().optional(),
  )
  .refine((v) => v !== undefined, { message: '유효한 날짜를 입력하세요.' })

export const createTodoSchema = z.object({
  title: z
    .string({ required_error: '제목을 입력하세요.' })
    .min(1, '제목을 입력하세요.')
    .max(200, '제목은 200자 이하로 입력하세요.'),
  description: z
    .string()
    .max(2000, '설명은 2000자 이하로 입력하세요.')
    .nullish(),
  priority: prioritySchema.default(0),
  dueDate: dueDateSchema,
})

export const updateTodoSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(200, '제목은 200자 이하로 입력하세요.').optional(),
  description: z.string().max(2000, '설명은 2000자 이하로 입력하세요.').nullish(),
  priority: prioritySchema.optional(),
  dueDate: dueDateSchema,
  completed: z.boolean().optional(),
})

export type CreateTodoInput = z.infer<typeof createTodoSchema>
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>

export interface TodoFilters {
  completed?: boolean
  priority?: number
}

/**
 * TODO를 생성한다. 본인 소유로 자동 연결한다.
 */
export async function createTodo(userId: string, input: CreateTodoInput) {
  return prisma.todo.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
      completed: false,
    },
  })
}

/**
 * 본인 TODO 목록을 필터와 정렬 조회한다.
 * 정렬: 완료 항목을 하단으로, dueDate 오름차순, 마감일 없는 항목은 뒤로.
 */
export async function getTodos(userId: string, filters: TodoFilters = {}) {
  const where: { userId: string; completed?: boolean; priority?: number } = { userId }
  if (filters.completed !== undefined) where.completed = filters.completed
  if (filters.priority !== undefined) where.priority = filters.priority

  return prisma.todo.findMany({
    where,
    orderBy: [
      { completed: 'asc' },
      { dueDate: { sort: 'asc', nulls: 'last' } },
    ],
  })
}

/**
 * 본인 TODO 단건 조회. 존재하지 않거나 소유자가 아니면 null.
 */
export async function getTodo(userId: string, id: string) {
  return prisma.todo.findFirst({
    where: { id, userId },
  })
}

/**
 * 본인 TODO 수정. 존재하지 않거나 소유자가 아니면 null.
 */
export async function updateTodo(userId: string, id: string, input: UpdateTodoInput) {
  const todo = await prisma.todo.findFirst({ where: { id, userId } })
  if (!todo) return null

  return prisma.todo.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.completed !== undefined ? { completed: input.completed } : {}),
    },
  })
}

/**
 * 본인 TODO 삭제. hard delete. 존재하지 않거나 소유자가 아니면 null.
 */
export async function deleteTodo(userId: string, id: string) {
  const todo = await prisma.todo.findFirst({ where: { id, userId } })
  if (!todo) return null

  return prisma.todo.delete({
    where: { id },
  })
}
