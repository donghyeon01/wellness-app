import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { PomodoroSession, PomodoroSessionInput, PomodoroStats } from '@/types/schemas'

export type PomodoroRange = 'day' | 'week' | 'month'

function formatDateQuery(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function getPomodoroSessionsQueryKey(range: PomodoroRange, date?: Date) {
  return ['pomodoro', 'sessions', range, formatDateQuery(date)]
}

export function getPomodoroStatsQueryKey(range: PomodoroRange, date?: Date) {
  return ['pomodoro', 'stats', range, formatDateQuery(date)]
}

export function usePomodoroSessions(range: PomodoroRange = 'day', date?: Date) {
  return useQuery({
    queryKey: getPomodoroSessionsQueryKey(range, date),
    queryFn: async () => {
      const { data } = await api.get<{ sessions: PomodoroSession[] }>('/pomodoro/sessions', {
        params: { range, date: formatDateQuery(date) },
      })
      return data.sessions
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function usePomodoroStats(range: PomodoroRange = 'day', date?: Date) {
  return useQuery({
    queryKey: getPomodoroStatsQueryKey(range, date),
    queryFn: async () => {
      const { data } = await api.get<PomodoroStats>('/pomodoro/stats', {
        params: { range, date: formatDateQuery(date) },
      })
      return data
    },
    staleTime: 60 * 1000,
  })
}

export function useCreatePomodoroSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: PomodoroSessionInput) => {
      const { data } = await api.post<{ session: PomodoroSession }>('/pomodoro/sessions', input)
      return data.session
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro'] })
    },
  })
}
