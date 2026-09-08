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

export const memoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  category: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const memoInputSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요.').max(200, '제목은 200자 이하로 입력하세요.'),
  content: z.string().max(100_000, '내용은 100,000자 이하로 입력하세요.'),
  category: z.string().max(50, '카테고리는 50자 이하로 입력하세요.').optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type User = z.infer<typeof userSchema>
export type Memo = z.infer<typeof memoSchema>
export type MemoInput = z.infer<typeof memoInputSchema>
