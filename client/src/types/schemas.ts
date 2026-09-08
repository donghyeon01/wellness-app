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

export const MOODS = ['happy', 'neutral', 'sad', 'angry', 'anxious'] as const

export const moodSchema = z.enum(MOODS, {
  message: '감정은 happy, neutral, sad, angry, anxious 중 하나여야 합니다.',
})

export type Mood = z.infer<typeof moodSchema>

export const diaryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜는 YYYY-MM-DD 형식이어야 합니다.')

export const diaryMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, '월은 YYYY-MM 형식이어야 합니다.')

export const diaryCreateSchema = z.object({
  date: diaryDateSchema,
  mood: moodSchema,
  content: z.string().min(1, '내용을 입력하세요.'),
})

export const diaryUpdateSchema = z
  .object({
    mood: moodSchema.optional(),
    content: z.string().min(1, '내용을 입력하세요.').optional(),
  })
  .refine((data) => data.mood !== undefined || data.content !== undefined, {
    message: '수정할 감정이나 내용을 입력하세요.',
  })

export const diarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  mood: moodSchema,
  content: z.string(),
  date: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Diary = z.infer<typeof diarySchema>
export type DiaryCreateInput = z.infer<typeof diaryCreateSchema>
export type DiaryUpdateInput = z.infer<typeof diaryUpdateSchema>
