import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLogin, useRegister, useLogout, useMe } from '@/api/auth'
import api from '@/lib/axios'
import { clearCsrfToken } from '@/lib/csrf'

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('@/lib/csrf', () => ({
  clearCsrfToken: vi.fn(),
  getCsrfToken: vi.fn(),
}))

const queryClient = new QueryClient()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('auth hooks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    queryClient.clear()
  })

  it('useLogin이 성공하면 사용자를 반환한다', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { user: { id: '1', email: 'test@example.com', name: '테스트' } },
    })

    const { result } = renderHook(() => useLogin(), { wrapper })
    result.current.mutate({ email: 'test@example.com', password: 'password1' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ id: '1', email: 'test@example.com', name: '테스트' })
    // 서버가 로그인 시 CSRF 토큰을 재발급하므로 클라이언트 캐시가 무효화되어야 한다
    expect(clearCsrfToken).toHaveBeenCalled()
  })

  it('useRegister가 성공하면 사용자를 반환하고 CSRF 캐시를 비운다', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { user: { id: '1', email: 'test@example.com', name: '테스트' } },
    })

    const { result } = renderHook(() => useRegister(), { wrapper })
    result.current.mutate({ email: 'test@example.com', password: 'password1', name: '테스트' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ id: '1', email: 'test@example.com', name: '테스트' })
    expect(clearCsrfToken).toHaveBeenCalled()
  })

  it('useLogout이 성공하면 ok를 반환하고 CSRF 캐시를 비운다', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { ok: true } })

    const { result } = renderHook(() => useLogout(), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(true)
    expect(clearCsrfToken).toHaveBeenCalled()
  })

  it('useMe가 인증된 사용자 정보를 반환한다', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { user: { id: '1', email: 'test@example.com', name: '테스트' } },
    })

    const { result } = renderHook(() => useMe(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ id: '1', email: 'test@example.com', name: '테스트' })
  })
})
