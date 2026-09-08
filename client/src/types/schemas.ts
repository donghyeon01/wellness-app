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

export const themeSchema = z.enum(['light', 'dark', 'system'])

export const settingsSchema = z.object({
  theme: themeSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type User = z.infer<typeof userSchema>
export type Theme = z.infer<typeof themeSchema>
export type Settings = z.infer<typeof settingsSchema>
