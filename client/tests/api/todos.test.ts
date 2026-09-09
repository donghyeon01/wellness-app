import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTodos, useTodo, useCreateTodo, useUpdateTodo, useDeleteTodo } from '@/api/todos'
import api from '@/lib/axios'

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const queryClient = new QueryClient()

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const sampleTodo = {
  id: '1',
  userId: 'u1',
  title: '테스트 TODO',
  description: null,
  priority: 1,
  dueDate: null,
  completed: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('todo hooks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    queryClient.clear()
  })

  it('useTodos가 목록과 필터 쿼리를 조회한다', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { todos: [sampleTodo] } })

    const { result } = renderHook(() => useTodos({ completed: 'active', priority: '2' }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([sampleTodo])
    expect(api.get).toHaveBeenCalledWith('/todos?completed=false&priority=2')
  })

  it('useTodo가 단건 조회한다', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { todo: sampleTodo } })

    const { result } = renderHook(() => useTodo('1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(sampleTodo)
    expect(api.get).toHaveBeenCalledWith('/todos/1')
  })

  it('useCreateTodo가 생성 후 목록 캐시를 무효화한다', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { todo: sampleTodo } })

    const { result } = renderHook(() => useCreateTodo(), { wrapper })
    result.current.mutate({ title: '새 TODO', priority: 0, description: null, dueDate: null })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(sampleTodo)
    expect(api.post).toHaveBeenCalledWith('/todos', {
      title: '새 TODO',
      priority: 0,
      description: null,
      dueDate: null,
    })
  })

  it('useCreateTodo가 마감일이 있으면 ISO 문자열로 변환한다', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { todo: sampleTodo } })

    const { result } = renderHook(() => useCreateTodo(), { wrapper })
    result.current.mutate({ title: '새 TODO', priority: 0, description: null, dueDate: '2024-12-31T00:00:00.000Z' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/todos', expect.objectContaining({ dueDate: '2024-12-31T00:00:00.000Z' }))
  })

  it('useUpdateTodo가 수정 후 캐시를 무효화한다', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({ data: { todo: { ...sampleTodo, completed: true } } })

    const { result } = renderHook(() => useUpdateTodo(), { wrapper })
    result.current.mutate({ id: '1', input: { completed: true } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.put).toHaveBeenCalledWith('/todos/1', { completed: true })
  })

  it('useDeleteTodo가 삭제 후 목록 캐시를 무효화한다', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { todo: sampleTodo } })

    const { result } = renderHook(() => useDeleteTodo(), { wrapper })
    result.current.mutate('1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/todos/1')
  })
})
