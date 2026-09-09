import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import Pomodoro from '@/pages/Pomodoro'

const mockMutate = vi.fn()

vi.mock('@/api/pomodoro', () => ({
  useCreatePomodoroSession: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  usePomodoroStats: () => ({
    data: undefined,
    isLoading: false,
  }),
}))

const queryClient = new QueryClient()

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('Pomodoro page', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    queryClient.clear()
    mockMutate.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('집중 모드와 기본 시간이 표시된다', () => {
    render(<Pomodoro />, { wrapper })
    expect(screen.getByText('뽀모도로 타이머')).toBeDefined()
    expect(screen.getByText('25:00')).toBeDefined()
    expect(screen.getByRole('button', { name: '휴식 모드' })).toBeDefined()
  })

  it('시작 버튼을 누르면 타이머가 작동하고 일시정지할 수 있다', () => {
    render(<Pomodoro />, { wrapper })

    fireEvent.click(screen.getByRole('button', { name: '시작' }))

    expect(screen.getByText('진행 중...')).toBeDefined()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText('24:59')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: '일시정지' }))

    expect(screen.getByText('일시정지됨')).toBeDefined()
  })

  it('집중 시간이 끝나면 세션 생성 API를 호출한다', () => {
    render(<Pomodoro />, { wrapper })

    const focusInput = screen.getByLabelText('집중')
    fireEvent.change(focusInput, { target: { value: '1' } })

    fireEvent.click(screen.getByRole('button', { name: '적용' }))

    expect(screen.getByText('01:00')).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: '시작' }))

    act(() => {
      vi.advanceTimersByTime(61000)
    })

    expect(mockMutate).toHaveBeenCalledWith({ duration: 60, type: 'focus' })
  })
})
