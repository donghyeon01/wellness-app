import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { Settings, Theme } from '@/types/schemas'

interface UseSettingsOptions {
  enabled?: boolean
}

export function useSettings({ enabled = true }: UseSettingsOptions = {}) {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await api.get<{ settings: Settings }>('/settings')
      return data.settings
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (theme: Theme) => {
      const { data } = await api.put<{ settings: Settings }>('/settings', { theme })
      return data.settings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
