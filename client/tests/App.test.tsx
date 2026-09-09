import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '@/App'

vi.mock('@/api/auth', () => ({
  useMe: () => ({ isLoading: false, isError: true }),
  useLogin: () => ({ mutate: vi.fn(), isPending: false }),
  useRegister: () => ({ mutate: vi.fn(), isPending: false }),
  useLogout: () => ({ mutate: vi.fn(), isPending: false }),
}))

// Memos 페이지가 import되므로 무거운 에디터 모듈은 대체한다.
vi.mock('@uiw/react-md-editor', () => ({
  default: () => null,
}))

const queryClient = new QueryClient()

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('App', () => {
  it('인증되지 않은 사용자가 /me에 접근하면 /login으로 리다이렉트한다', async () => {
    window.history.pushState({}, '', '/me')
    render(<App />, { wrapper })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '로그인' })).toBeDefined()
    })
  })
})
