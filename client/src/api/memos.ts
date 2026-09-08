import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Memo, MemoInput } from '@/types/schemas'

export function useMemos(category?: string) {
  return useQuery({
    queryKey: ['memos', category ?? ''],
    queryFn: async () => {
      const { data } = await api.get<{ memos: Memo[] }>('/memos', {
        params: category ? { category } : {},
      })
      return data.memos
    },
  })
}

export function useMemo(id: string | undefined) {
  return useQuery({
    queryKey: ['memos', 'detail', id],
    queryFn: async () => {
      const { data } = await api.get<{ memo: Memo }>(`/memos/${id}`)
      return data.memo
    },
    enabled: Boolean(id),
  })
}

export function useCreateMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: MemoInput) => {
      const { data } = await api.post<{ memo: Memo }>('/memos', input)
      return data.memo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memos'] })
    },
  })
}

export function useUpdateMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: MemoInput & { id: string }) => {
      const { data } = await api.put<{ memo: Memo }>(`/memos/${id}`, input)
      return data.memo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memos'] })
    },
  })
}

export function useDeleteMemo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ ok: boolean }>(`/memos/${id}`)
      return data.ok
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memos'] })
    },
  })
}
