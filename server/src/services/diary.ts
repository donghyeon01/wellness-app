import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const MOODS = ['happy', 'neutral', 'sad', 'angry', 'anxious'] as const
export type Mood = (typeof MOODS)[number]

export interface DiaryData {
  mood: Mood
  content: string
  date: string
}

export interface DiaryUpdateData {
  mood?: Mood
  content?: string
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function monthRange(month: string) {
  const [year, monthIndex] = month.split('-').map(Number)
  const start = new Date(Date.UTC(year, monthIndex - 1, 1))
  const end = new Date(Date.UTC(year, monthIndex, 1))
  return { start, end }
}

export class DiaryConflictError extends Error {
  constructor() {
    super('동일한 날짜의 일기가 이미 존재합니다.')
    this.name = 'DiaryConflictError'
  }
}

export async function listDiaries(userId: string, month: string) {
  const { start, end } = monthRange(month)
  return prisma.diary.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { date: 'asc' },
  })
}

export async function getDiaryByDate(userId: string, date: string) {
  const parsed = parseDate(date)
  return prisma.diary.findUnique({
    where: {
      userId_date: {
        userId,
        date: parsed,
      },
    },
  })
}

export async function createDiary(userId: string, data: DiaryData) {
  const { mood, content, date } = data
  const parsedDate = parseDate(date)

  try {
    return await prisma.diary.create({
      data: {
        userId,
        mood,
        content,
        date: parsedDate,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new DiaryConflictError()
    }
    throw e
  }
}

export async function updateDiary(
  userId: string,
  id: string,
  data: DiaryUpdateData,
) {
  const existing = await prisma.diary.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return null
  }

  return prisma.diary.update({
    where: { id },
    data,
  })
}

export async function deleteDiary(userId: string, id: string) {
  const existing = await prisma.diary.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return null
  }

  await prisma.diary.delete({ where: { id } })
  return existing
}
