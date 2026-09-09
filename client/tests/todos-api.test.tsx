import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTodos, useTodo, useCreateTodo, useUpdateTodo, useDeleteTodo } from '@/api/todos'
import api from '@/lib/axios'

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(async () => ({ data: { todos: [], todo: null } })),
    post: vi.fn(async () => ({ data: { todo: { id: 'new' } } })),
    put: vi.fn(async () => ({ data: { todo: { id: 'x' } } })),
    delete: vi.fn(async () => ({ data: { todo: { id: 'x' } } })),
  },
}))

const mockedGet = vi.mocked(api.get)
const mockedPost = vi.mocked(api.post)
const mockedPut = vi.mocked(api.put)
const mockedDelete = vi.mocked(api.delete)

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper, invalidateSpy }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useTodos', () => {
  it('기본 필터는 쿼리 파라미터 없이 요청한다', async () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useTodos(), { wrapper })

    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/todos?'))
  })

  it('completed/priority 필터를 쿼리 파라미터로 변환한다', async () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useTodos({ completed: 'active', priority: '2' }), { wrapper })

    await waitFor(() =>
      expect(mockedGet).toHaveBeenCalledWith('/todos?completed=false&priority=2'),
    )
  })

  it('completed=completed 필터는 completed=true로 변환한다', async () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useTodos({ completed: 'completed', priority: 'all' }), { wrapper })

    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/todos?completed=true'))
  })
})

describe('useTodo', () => {
  it('단건 조회는 /todos/:id를 호출한다', async () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useTodo('abc'), { wrapper })

    await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/todos/abc'))
  })

  it('id가 비어 있으면 요청하지 않는다', () => {
    const { wrapper } = makeWrapper()
    renderHook(() => useTodo(''), { wrapper })

    expect(mockedGet).not.toHaveBeenCalled()
  })
})

describe('useCreateTodo', () => {
  it('POST /todos를 호출하고 목록 캐시를 무효화한다', async () => {
    const { wrapper, invalidateSpy } = makeWrapper()
    const { result } = renderHook(() => useCreateTodo(), { wrapper })

    result.current.mutate({ title: '새 할일', priority: 1 })

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/todos', { title: '새 할일', priority: 1 }),
    )
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] }),
    )
  })

  it('dueDate가 있으면 ISO 문자열로 변환해 전송한다', async () => {
    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useCreateTodo(), { wrapper })

    result.current.mutate({ title: '마감', priority: 0, dueDate: '2026-01-05' })

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/todos', {
        title: '마감',
        priority: 0,
        dueDate: '2026-01-05T00:00:00.000Z',
      }),
    )
  })
})

describe('useUpdateTodo', () => {
  it('PUT /todos/:id를 호출하고 목록 캐시를 무효화한다', async () => {
    const { wrapper, invalidateSpy } = makeWrapper()
    const { result } = renderHook(() => useUpdateTodo(), { wrapper })

    result.current.mutate({ id: 't1', input: { completed: true } })

    await waitFor(() =>
      expect(mockedPut).toHaveBeenCalledWith('/todos/t1', { completed: true }),
    )
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] }),
    )
  })
})

describe('useDeleteTodo', () => {
  it('DELETE /todos/:id를 호출하고 목록 캐시를 무효화한다', async () => {
    const { wrapper, invalidateSpy } = makeWrapper()
    const { result } = renderHook(() => useDeleteTodo(), { wrapper })

    result.current.mutate('t9')

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('/todos/t9'))
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['todos'] }),
    )
  })
})
