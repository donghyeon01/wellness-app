import { prisma } from '@/lib/prisma'

export type PomodoroMode = 'focus' | 'break'

export interface PomodoroSessionInput {
  duration?: number
  type: PomodoroMode
}

export interface PomodoroStats {
  totalSeconds: number
  count: number
}

export interface PomodoroDefaultSettings {
  focus: number
  break: number
}

const DEFAULT_FOCUS_SECONDS = 1500 // 25분
const DEFAULT_BREAK_SECONDS = 300 // 5분

/**
 * ISO 8601 날짜 문자열(yyyy-mm-dd)을 UTC 자정 Date로 파싱한다.
 */
function parseISODateUTC(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date.getTime())
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function getMonthBoundsUTC(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
  return { start, end }
}

function getWeekBoundsUTC(date: Date): { start: Date; end: Date } {
  const day = date.getUTCDay()
  // 월요일(1)을 주의 시작으로 한다. 일요일(0)은 -6.
  const diff = day === 0 ? -6 : 1 - day
  const start = addDaysUTC(date, diff)
  const end = addDaysUTC(start, 7)
  return { start, end }
}

export function getRangeBounds(
  range: 'day' | 'week' | 'month',
  date: string,
): { start: Date; end: Date } {
  const base = parseISODateUTC(date)
  if (range === 'day') {
    return { start: base, end: addDaysUTC(base, 1) }
  }
  if (range === 'week') {
    return getWeekBoundsUTC(base)
  }
  return getMonthBoundsUTC(base)
}

export async function getPomodoroDefaults(userId: string): Promise<PomodoroDefaultSettings> {
  const settings = await prisma.userSettings.findUnique({ where: { userId } })
  return {
    focus: settings?.pomodoroFocus ?? DEFAULT_FOCUS_SECONDS,
    break: settings?.pomodoroBreak ?? DEFAULT_BREAK_SECONDS,
  }
}

export async function listPomodoroSessions(
  userId: string,
  range: 'day' | 'week' | 'month',
  date: string,
) {
  const { start, end } = getRangeBounds(range, date)
  return prisma.pomodoroSession.findMany({
    where: {
      userId,
      completedAt: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { completedAt: 'desc' },
  })
}

export async function createPomodoroSession(userId: string, input: PomodoroSessionInput) {
  if (input.duration !== undefined && input.duration <= 0) {
    throw new Error('세션 시간은 0보다 커야 합니다.')
  }

  const defaults = await getPomodoroDefaults(userId)
  const duration = input.duration ?? (input.type === 'focus' ? defaults.focus : defaults.break)

  if (duration <= 0) {
    throw new Error('세션 시간은 0보다 커야 합니다.')
  }

  return prisma.pomodoroSession.create({
    data: {
      userId,
      duration,
      type: input.type,
    },
  })
}

export async function getPomodoroStats(
  userId: string,
  range: 'day' | 'week' | 'month',
  date: string,
): Promise<PomodoroStats> {
  const { start, end } = getRangeBounds(range, date)
  const sessions = await prisma.pomodoroSession.findMany({
    where: {
      userId,
      completedAt: {
        gte: start,
        lt: end,
      },
      type: 'focus',
    },
  })

  const totalSeconds = sessions.reduce(
    (sum: number, session: { duration: number }) => sum + session.duration,
    0,
  )
  return { totalSeconds, count: sessions.length }
}
