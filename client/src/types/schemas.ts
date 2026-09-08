import { z } from 'zod'

export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
  .max(128, '비밀번호는 최대 128자 이하여야 합니다.')
  .regex(/[A-Za-z]/, '비밀번호에 영문이 1자 이상 포함되어야 합니다.')
  .regex(/[0-9]/, '비밀번호에 숫자가 1자 이상 포함되어야 합니다.')

export const registerSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: passwordSchema,
  name: z.string().min(1, '이름을 입력하세요.').max(100, '이름은 100자 이하로 입력하세요.'),
})

export const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: z.string().min(1, '비밀번호를 입력하세요.'),
})

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type User = z.infer<typeof userSchema>

export const todoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(2),
  dueDate: z.string().datetime().nullable().optional(),
  completed: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

const todoBaseSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(200, '제목은 200자 이하로 입력하세요.'),
  description: z.string().max(2000, '설명은 2000자 이하로 입력하세요.').nullish(),
  priority: z.number().int().min(0, '우선순위는 0~2 사이여야 합니다.').max(2, '우선순위는 0~2 사이여야 합니다.'),
  dueDate: z
    .string()
    .refine((v) => v === undefined || v === null || v === '' || !Number.isNaN(new Date(v).getTime()), {
      message: '유효한 날짜를 입력하세요.',
    })
    .nullish(),
})

export const todoInputSchema = todoBaseSchema.extend({
  priority: todoBaseSchema.shape.priority.default(0),
})

export const todoUpdateSchema = todoBaseSchema.partial().extend({
  completed: z.boolean().optional(),
})

export const todoFiltersSchema = z.object({
  completed: z.enum(['all', 'active', 'completed']).default('all'),
  priority: z.enum(['all', '0', '1', '2']).default('all'),
})

export type Todo = z.infer<typeof todoSchema>
export type TodoInput = z.infer<typeof todoInputSchema>
export type TodoUpdateInput = z.infer<typeof todoUpdateSchema>
export type TodoFilters = z.infer<typeof todoFiltersSchema>
