import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/stores/auth'
import type { User } from '@/types/schemas'

const mockUser: User = { id: '1', email: 'test@example.com', name: '테스트' }

describe('useAuth store', () => {
  it('user가 null로 초기화된다', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
  })

  it('setUser로 사용자를 설정할 수 있다', () => {
    const { result } = renderHook(() => useAuth())
    act(() => {
      result.current.setUser(mockUser)
    })
    expect(result.current.user).toEqual(mockUser)
  })

  it('clearUser로 사용자를 제거할 수 있다', () => {
    const { result } = renderHook(() => useAuth())
    act(() => {
      result.current.setUser(mockUser)
      result.current.clearUser()
    })
    expect(result.current.user).toBeNull()
  })
})
