import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 최소 8자 이상이어야 합니다.")
  .max(128, "비밀번호는 최대 128자 이하여야 합니다.")
  .regex(/[A-Za-z]/, "비밀번호에 영문이 1자 이상 포함되어야 합니다.")
  .regex(/[0-9]/, "비밀번호에 숫자가 1자 이상 포함되어야 합니다.");

export const registerSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요."),
  password: passwordSchema,
  name: z
    .string()
    .min(1, "이름을 입력하세요.")
    .max(100, "이름은 100자 이하로 입력하세요."),
});

export const loginSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요."),
  password: z.string().min(1, "비밀번호를 입력하세요."),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
});

export const memoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  content: z.string(),
  category: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const memoInputSchema = z.object({
  title: z
    .string()
    .min(1, "제목을 입력하세요.")
    .max(200, "제목은 200자 이하로 입력하세요."),
  content: z.string().max(100_000, "내용은 100,000자 이하로 입력하세요."),
  category: z.string().max(50, "카테고리는 50자 이하로 입력하세요.").optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = z.infer<typeof userSchema>;
export type Memo = z.infer<typeof memoSchema>;
export type MemoInput = z.infer<typeof memoInputSchema>;

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  start: z.string(),
  end: z.string(),
});

export const eventFormSchema = z
  .object({
    title: z
      .string()
      .min(1, "제목을 입력하세요.")
      .max(200, "제목은 200자 이하로 입력하세요."),
    description: z
      .string()
      .max(2000, "설명은 2000자 이하로 입력하세요.")
      .optional(),
    start: z.string().min(1, "시작 시각을 입력하세요."),
    end: z.string().min(1, "종료 시각을 입력하세요."),
  })
  .refine((v) => new Date(v.start).getTime() < new Date(v.end).getTime(), {
    message: "종료 시각은 시작 시각보다 뒤여야 합니다.",
    path: ["end"],
  });

export type CalendarEvent = z.infer<typeof eventSchema>;
export type EventFormInput = z.infer<typeof eventFormSchema>;

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
});

const todoBaseSchema = z.object({
  title: z
    .string()
    .min(1, "제목을 입력하세요.")
    .max(200, "제목은 200자 이하로 입력하세요."),
  description: z
    .string()
    .max(2000, "설명은 2000자 이하로 입력하세요.")
    .nullish(),
  priority: z
    .number()
    .int()
    .min(0, "우선순위는 0~2 사이여야 합니다.")
    .max(2, "우선순위는 0~2 사이여야 합니다."),
  dueDate: z
    .string()
    .refine(
      (v) =>
        v === undefined ||
        v === null ||
        v === "" ||
        !Number.isNaN(new Date(v).getTime()),
      {
        message: "유효한 날짜를 입력하세요.",
      },
    )
    .nullish(),
});

export const todoInputSchema = todoBaseSchema.extend({
  priority: todoBaseSchema.shape.priority.default(0),
});

export const todoUpdateSchema = todoBaseSchema.partial().extend({
  completed: z.boolean().optional(),
});

export const todoFiltersSchema = z.object({
  completed: z.enum(["all", "active", "completed"]).default("all"),
  priority: z.enum(["all", "0", "1", "2"]).default("all"),
});

export type Todo = z.infer<typeof todoSchema>;
export type TodoInput = z.infer<typeof todoInputSchema>;
export type TodoUpdateInput = z.infer<typeof todoUpdateSchema>;
export type TodoFilters = z.infer<typeof todoFiltersSchema>;

export const MOODS = ["happy", "neutral", "sad", "angry", "anxious"] as const;

export const moodSchema = z.enum(MOODS, {
  message: "감정은 happy, neutral, sad, angry, anxious 중 하나여야 합니다.",
});

export type Mood = z.infer<typeof moodSchema>;

export const diaryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식이어야 합니다.");

export const diaryMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "월은 YYYY-MM 형식이어야 합니다.");

export const diaryCreateSchema = z.object({
  date: diaryDateSchema,
  mood: moodSchema,
  content: z.string().min(1, "내용을 입력하세요."),
});

export const diaryUpdateSchema = z
  .object({
    mood: moodSchema.optional(),
    content: z.string().min(1, "내용을 입력하세요.").optional(),
  })
  .refine((data) => data.mood !== undefined || data.content !== undefined, {
    message: "수정할 감정이나 내용을 입력하세요.",
  });

export const diarySchema = z.object({
  id: z.string(),
  userId: z.string(),
  mood: moodSchema,
  content: z.string(),
  date: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Diary = z.infer<typeof diarySchema>;
export type DiaryCreateInput = z.infer<typeof diaryCreateSchema>;
export type DiaryUpdateInput = z.infer<typeof diaryUpdateSchema>;
