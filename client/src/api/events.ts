import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import type { CalendarEvent } from '@/types/schemas'

export interface EventRange {
  start?: string
  end?: string
}

export interface EventPayload {
  title: string
  description?: string
  start: string
  end: string
}

export interface UpdateEventPayload {
  id: string
  input: Partial<EventPayload>
}

const EVENTS_KEY = 'events'

export function useEvents(range: EventRange = {}) {
  return useQuery({
    queryKey: [EVENTS_KEY, range.start ?? null, range.end ?? null],
    queryFn: async () => {
      const { data } = await api.get<{ events: CalendarEvent[] }>('/events', {
        params: range,
      })
      return data.events
    },
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: EventPayload) => {
      const { data } = await api.post<{ event: CalendarEvent }>('/events', input)
      return data.event
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_KEY] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: UpdateEventPayload) => {
      const { data } = await api.put<{ event: CalendarEvent }>(`/events/${id}`, input)
      return data.event
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_KEY] })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ ok: boolean }>(`/events/${id}`)
      return data.ok
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_KEY] })
    },
  })
}
