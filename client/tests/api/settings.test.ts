import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSettings, useUpdateSettings } from '@/api/settings'
import api from '@/lib/axios'

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

const queryClient = new QueryClient()

// .ts 확장자에서는 JSX를 쓸 수 없으므로 createElement로 래퍼를 만든다.
function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('settings hooks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    queryClient.clear()
  })

  it('useSettings가 서버 설정을 조회한다', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { settings: { theme: 'dark' } },
    })

    const { result } = renderHook(() => useSettings(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ theme: 'dark' })
    expect(api.get).toHaveBeenCalledWith('/settings')
  })

  it('useSettings가 disabled면 요청하지 않는다', async () => {
    renderHook(() => useSettings({ enabled: false }), { wrapper })
    expect(api.get).not.toHaveBeenCalled()
  })

  it('useUpdateSettings가 테마를 서버에 저장한다', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({
      data: { settings: { theme: 'light' } },
    })

    const { result } = renderHook(() => useUpdateSettings(), { wrapper })
    result.current.mutate('light')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ theme: 'light' })
    expect(api.put).toHaveBeenCalledWith('/settings', { theme: 'light' })
  })
})
