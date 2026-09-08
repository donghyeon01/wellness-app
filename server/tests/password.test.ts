import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, passwordSchema } from '@/services/auth/password'

describe('password', () => {
  it('Argon2id로 해시하고 검증한다', async () => {
    const hash = await hashPassword('Password1')
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(await verifyPassword(hash, 'Password1')).toBe(true)
    expect(await verifyPassword(hash, 'WrongPass1')).toBe(false)
  })

  it('비밀번호 길이는 8~128자여야 한다', () => {
    expect(passwordSchema.safeParse('short1A').success).toBe(false)
    expect(passwordSchema.safeParse('validPass1').success).toBe(true)
    expect(passwordSchema.safeParse('a'.repeat(128) + '1').success).toBe(false)
  })

  it('비밀번호는 영문과 숫자를 각각 1자 이상 포함해야 한다', () => {
    expect(passwordSchema.safeParse('12345678').success).toBe(false)
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(false)
    expect(passwordSchema.safeParse('Abcdefg1').success).toBe(true)
  })
})
