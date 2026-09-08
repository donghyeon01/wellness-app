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

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  start: z.string(),
  end: z.string(),
})

// 캘린더 이벤트 폼 입력 검증 — 서버와 동일하게 start < end를 강제한다.
export const eventFormSchema = z
  .object({
    title: z
      .string()
      .min(1, '제목을 입력하세요.')
      .max(200, '제목은 200자 이하로 입력하세요.'),
    description: z
      .string()
      .max(2000, '설명은 2000자 이하로 입력하세요.')
      .optional(),
    start: z.string().min(1, '시작 시각을 입력하세요.'),
    end: z.string().min(1, '종료 시각을 입력하세요.'),
  })
  .refine((v) => new Date(v.start).getTime() < new Date(v.end).getTime(), {
    message: '종료 시각은 시작 시각보다 뒤여야 합니다.',
    path: ['end'],
  })

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type User = z.infer<typeof userSchema>
export type CalendarEvent = z.infer<typeof eventSchema>
export type EventFormInput = z.infer<typeof eventFormSchema>
