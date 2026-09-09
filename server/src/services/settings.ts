import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// DB에 저장되는 테마 값
export const themeSchema = z.enum(['light', 'dark', 'system'])

export type Theme = z.infer<typeof themeSchema>

export const updateSettingsSchema = z.object({
  theme: themeSchema,
})

export interface UserSettings {
  theme: Theme
}

/**
 * 사용자 설정을 조회합니다. 설정이 없으면 기본값 'system'을 반환합니다.
 */
export async function getSettings(userId: string): Promise<UserSettings> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { theme: true },
  })
  return { theme: (settings?.theme as Theme) ?? 'system' }
}

/**
 * 테마 설정을 업데이트하거나 새로 생성합니다.
 */
export async function updateSettings(
  userId: string,
  input: unknown,
): Promise<UserSettings> {
  const parsed = updateSettingsSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0].message)
  }

  const { theme } = parsed.data
  await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, theme },
    update: { theme },
  })

  return { theme }
}
