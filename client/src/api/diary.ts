import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Diary, DiaryCreateInput, DiaryUpdateInput } from '@/types/schemas'

export function useDiaries(month: string) {
  return useQuery({
    queryKey: ['diaries', month],
    queryFn: async () => {
      const { data } = await api.get<{ diaries: Diary[] }>('/diaries', {
        params: { month },
      })
      return data.diaries
    },
    enabled: !!month,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDiary(date: string) {
  return useQuery({
    queryKey: ['diaries', date],
    queryFn: async () => {
      const { data } = await api.get<{ diary: Diary | null }>(`/diaries/${date}`)
      return data.diary
    },
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateDiary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: DiaryCreateInput) => {
      const { data } = await api.post<{ diary: Diary }>('/diaries', input)
      return data.diary
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] })
    },
  })
}

export function useUpdateDiary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: DiaryUpdateInput }) => {
      const { data } = await api.put<{ diary: Diary }>(`/diaries/${id}`, input)
      return data.diary
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] })
    },
  })
}

export function useDeleteDiary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/diaries/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] })
    },
  })
}
