import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Todo, TodoInput, TodoUpdateInput, TodoFilters } from '@/types/schemas'

const LIST_KEY = 'todos' as const
const DETAIL_KEY = 'todo' as const

/**
 * 본인 TODO 목록을 completed/priority 필터로 조회한다.
 */
export function useTodos(filters: TodoFilters = { completed: 'all', priority: 'all' }) {
  return useQuery({
    queryKey: [LIST_KEY, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.completed === 'active') params.set('completed', 'false')
      if (filters.completed === 'completed') params.set('completed', 'true')
      if (filters.priority !== 'all') params.set('priority', filters.priority)

      const { data } = await api.get<{ todos: Todo[] }>(`/todos?${params.toString()}`)
      return data.todos
    },
  })
}

/**
 * TODO 단건 조회.
 */
export function useTodo(id: string) {
  return useQuery({
    queryKey: [DETAIL_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<{ todo: Todo }>(`/todos/${id}`)
      return data.todo
    },
    enabled: !!id,
  })
}

/**
 * TODO 생성.
 */
export function useCreateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: TodoInput) => {
      const payload = input.dueDate ? { ...input, dueDate: new Date(input.dueDate).toISOString() } : input
      const { data } = await api.post<{ todo: Todo }>('/todos', payload)
      return data.todo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LIST_KEY] })
    },
  })
}

/**
 * TODO 수정.
 */
export function useUpdateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: TodoUpdateInput }) => {
      const payload =
        input.dueDate !== undefined && input.dueDate
          ? { ...input, dueDate: new Date(input.dueDate).toISOString() }
          : input
      const { data } = await api.put<{ todo: Todo }>(`/todos/${id}`, payload)
      return data.todo
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [LIST_KEY] })
      queryClient.invalidateQueries({ queryKey: [DETAIL_KEY, id] })
    },
  })
}

/**
 * TODO 삭제.
 */
export function useDeleteTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ todo: Todo }>(`/todos/${id}`)
      return data.todo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LIST_KEY] })
    },
  })
}
