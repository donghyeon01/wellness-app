import { describe, it, expect, vi } from 'vitest'
import { MemorySessionStore } from '@/sessions/memory'

describe('MemorySessionStore', () => {
  it('세션을 저장하고 조회한다', async () => {
    const store = new MemorySessionStore()
    const data = { userId: 'u1', csrfToken: 't', createdAt: 1, lastAccess: 1 }
    await store.set('s1', data, 3600)
    const got = await store.get('s1')
    expect(got).toEqual(data)
  })

  it('TTL이 지나면 세션이 만료된다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const store = new MemorySessionStore()
    await store.set('s1', { createdAt: 0, lastAccess: 0 }, 1)
    vi.advanceTimersByTime(1001)
    const got = await store.get('s1')
    expect(got).toBeNull()
    vi.useRealTimers()
  })

  it('touch로 만료 시간과 마지막 접근 시각을 갱신한다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const store = new MemorySessionStore()
    await store.set('s1', { userId: 'u1', createdAt: 0, lastAccess: 0 }, 1)
    vi.advanceTimersByTime(500)
    await store.touch('s1', 1)
    vi.advanceTimersByTime(500)
    const got = await store.get('s1')
    expect(got).not.toBeNull()
    expect(got!.lastAccess).toBe(500)
    vi.useRealTimers()
  })
})
