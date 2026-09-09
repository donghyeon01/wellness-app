import { prisma } from '@/lib/prisma'

export interface Event {
  id: string
  userId: string
  title: string
  description: string | null
  start: Date
  end: Date
  createdAt: Date
  updatedAt: Date
}

export interface EventRange {
  start?: Date
  end?: Date
}

export interface CreateEventData {
  title: string
  description?: string | null
  start: Date
  end: Date
}

export interface UpdateEventData {
  title?: string
  description?: string | null
  start?: Date
  end?: Date
}

/**
 * 조회 범위와 시간이 겹치는 본인 이벤트만 반환한다.
 * 겹침 조건: event.start < range.end AND event.end > range.start
 */
export async function listEvents(userId: string, range: EventRange): Promise<Event[]> {
  return prisma.event.findMany({
    where: {
      userId,
      ...(range.start ? { end: { gt: range.start } } : {}),
      ...(range.end ? { start: { lt: range.end } } : {}),
    },
    orderBy: { start: 'asc' },
  })
}

export async function createEvent(userId: string, data: CreateEventData): Promise<Event> {
  return prisma.event.create({
    data: {
      userId,
      title: data.title,
      description: data.description ?? null,
      start: data.start,
      end: data.end,
    },
  })
}

// 소유권을 함께 검사해 타인의 이벤트 존재 여부를 노출하지 않는다.
export async function findOwnedEvent(userId: string, id: string): Promise<Event | null> {
  return prisma.event.findFirst({ where: { id, userId } })
}

// id로만 조회한다. 라우트에서 존재/소유권을 분리해 처리할 때 사용한다.
export async function findEventById(id: string): Promise<Event | null> {
  return prisma.event.findUnique({ where: { id } })
}

export async function updateEvent(
  userId: string,
  id: string,
  data: UpdateEventData,
): Promise<Event | null> {
  const owned = await findOwnedEvent(userId, id)
  if (!owned) return null
  return prisma.event.update({ where: { id }, data })
}

export async function deleteEvent(userId: string, id: string): Promise<boolean> {
  const owned = await findOwnedEvent(userId, id)
  if (!owned) return false
  await prisma.event.delete({ where: { id } })
  return true
}
