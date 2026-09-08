import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import Login from '@/pages/Login'
import api from '@/lib/axios'

vi.mock('@/lib/axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

const queryClient = new QueryClient()

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('Login page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    queryClient.clear()
  })

  it('이메일과 비밀번호 입력란이 렌더링된다', () => {
    render(<Login />, { wrapper })
    expect(screen.getByLabelText('이메일')).toBeDefined()
    expect(screen.getByLabelText('비밀번호')).toBeDefined()
  })

  it('유효하지 않은 이메일을 입력하면 Zod 검증 오류를 표시한다', async () => {
    const user = userEvent.setup()
    render(<Login />, { wrapper })

    await user.type(screen.getByLabelText('이메일'), 'invalid')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(screen.getByText('유효한 이메일을 입력하세요.')).toBeDefined()
    })
  })

  it('유효한 입력으로 제출하면 로그인 API를 호출한다', async () => {
    const user = userEvent.setup()
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { user: { id: '1', email: 'test@example.com', name: '테스트' } },
    })

    render(<Login />, { wrapper })

    await user.type(screen.getByLabelText('이메일'), 'test@example.com')
    await user.type(screen.getByLabelText('비밀번호'), 'password1')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password1',
      })
    })
  })
})
