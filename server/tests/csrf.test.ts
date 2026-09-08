import { describe, it, expect } from 'vitest'
import { createCsrfToken, verifyCsrfToken } from '@/services/auth/csrf'
import { MemorySessionStore } from '@/sessions/memory'

describe('csrf', () => {
  it('토큰을 생성하고 세션에 저장하며 검증한다', async () => {
    const store = new MemorySessionStore()
    const token = await createCsrfToken('sid1', store)
    const session = await store.get('sid1')
    expect(token).toBe(session?.csrfToken)
    expect(await verifyCsrfToken(session, token)).toBe(true)
    expect(await verifyCsrfToken(session, 'wrong-token')).toBe(false)
  })

  it('세션이나 토큰이 없으면 검증에 실패한다', async () => {
    expect(await verifyCsrfToken(undefined, 'token')).toBe(false)
    expect(await verifyCsrfToken({ createdAt: 1, lastAccess: 1 }, undefined)).toBe(false)
  })
})
