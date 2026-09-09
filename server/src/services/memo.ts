import { prisma } from '@/lib/prisma'

export interface MemoCreateInput {
  title: string
  content: string
  category?: string | null
}

export interface MemoUpdateInput {
  title?: string
  content?: string
  category?: string | null
}

export function listMemos(userId: string, category?: string) {
  return prisma.memo.findMany({
    where: {
      userId,
      ...(category ? { category } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  })
}

// 소유자 조건을 함께 걸어 타인 메모의 존재 여부를 404로 처리한다.
export function getMemo(userId: string, id: string) {
  return prisma.memo.findFirst({ where: { id, userId } })
}

export function createMemo(userId: string, data: MemoCreateInput) {
  return prisma.memo.create({
    data: {
      userId,
      title: data.title,
      content: data.content,
      category: data.category ?? null,
    },
  })
}

export async function updateMemo(userId: string, id: string, data: MemoUpdateInput) {
  const memo = await getMemo(userId, id)
  if (!memo) return null
  return prisma.memo.update({
    where: { id: memo.id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
    },
  })
}

export async function deleteMemo(userId: string, id: string) {
  const memo = await getMemo(userId, id)
  if (!memo) return false
  await prisma.memo.delete({ where: { id: memo.id } })
  return true
}
