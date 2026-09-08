import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Todos from '@/pages/Todos'

const queryClient = new QueryClient()

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

vi.mock('@/api/todos', () => ({
  useTodos: vi.fn(),
  useCreateTodo: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateTodo: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteTodo: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

import { useTodos } from '@/api/todos'

describe('Todos page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    queryClient.clear()
    vi.mocked(useTodos).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as ReturnType<typeof useTodos>)
  })

  it('목록이 로딩 중이면 불러오는 중 메시지가 표시된다', () => {
    render(<Todos />, { wrapper })
    expect(screen.getByText('불러오는 중...')).toBeDefined()
  })

  it('TODO 목록과 필터, 생성 폼이 표시된다', async () => {
    vi.mocked(useTodos).mockReturnValue({
      data: [
        {
          id: '1',
          userId: 'u1',
          title: '테스트 TODO',
          description: '설명',
          priority: 2,
          dueDate: '2024-12-31T00:00:00.000Z',
          completed: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useTodos>)

    render(<Todos />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText('테스트 TODO')).toBeDefined()
    })

    expect(screen.getByLabelText('완료')).toBeDefined()
    expect(screen.getByLabelText('우선순위')).toBeDefined()
    expect(screen.getByRole('button', { name: '생성' })).toBeDefined()
  })

  it('완료 TODO에는 취소선이 표시된다', async () => {
    vi.mocked(useTodos).mockReturnValue({
      data: [
        {
          id: '1',
          userId: 'u1',
          title: '완료된 TODO',
          description: null,
          priority: 0,
          dueDate: null,
          completed: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useTodos>)

    render(<Todos />, { wrapper })

    await waitFor(() => {
      const title = screen.getByText('완료된 TODO')
      expect(title.className).toContain('line-through')
    })
  })

  it('우선순위 필터를 변경하면 useTodos가 다시 호출된다', async () => {
    const useTodosMock = vi.mocked(useTodos)
    useTodosMock.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useTodos>)

    render(<Todos />, { wrapper })

    const priorityFilter = screen.getByLabelText('우선순위')
    fireEvent.change(priorityFilter, { target: { value: '2' } })

    await waitFor(() => {
      expect(useTodosMock).toHaveBeenLastCalledWith(expect.objectContaining({ priority: '2' }))
    })
  })
})
