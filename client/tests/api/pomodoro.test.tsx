import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  usePomodoroSessions,
  usePomodoroStats,
  useCreatePomodoroSession,
} from '@/api/pomodoro'
import api from '@/lib/axios'
import type { PomodoroSession } from '@/types/schemas'

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('pomodoro API hooks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    queryClient.clear()
  })

  it('usePomodoroSessions는 세션 목록을 조회한다', async () => {
    const mockSession: PomodoroSession = {
      id: 'ps1',
      duration: 1500,
      type: 'focus',
      completedAt: new Date().toISOString(),
    }
    vi.mocked(api.get).mockResolvedValueOnce({ data: { sessions: [mockSession] } })

    const { result } = renderHook(() => usePomodoroSessions('day'), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual([mockSession])
    })

    expect(api.get).toHaveBeenCalledWith('/pomodoro/sessions', {
      params: { range: 'day', date: expect.any(String) },
    })
  })

  it('usePomodoroStats는 통계를 조회한다', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { totalSeconds: 1500, count: 1 } })

    const { result } = renderHook(() => usePomodoroStats('week'), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual({ totalSeconds: 1500, count: 1 })
    })

    expect(api.get).toHaveBeenCalledWith('/pomodoro/stats', {
      params: { range: 'week', date: expect.any(String) },
    })
  })

  it('useCreatePomodoroSession는 세션을 생성하고 쿼리를 무효화한다', async () => {
    const mockSession: PomodoroSession = {
      id: 'ps2',
      duration: 1500,
      type: 'focus',
      completedAt: new Date().toISOString(),
    }
    vi.mocked(api.post).mockResolvedValueOnce({ data: { session: mockSession } })

    const { result } = renderHook(() => useCreatePomodoroSession(), { wrapper })

    await waitFor(() => {
      result.current.mutate({ duration: 1500, type: 'focus' })
    })

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/pomodoro/sessions', {
        duration: 1500,
        type: 'focus',
      })
    })
  })
})
