import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from '@/api/events'
import api from '@/lib/axios'

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

const sampleEvent = {
  id: 'e1',
  title: '운동',
  description: null,
  start: '2026-09-10T10:00:00.000Z',
  end: '2026-09-10T11:00:00.000Z',
}

function makeWrapper(queryClient: QueryClient) {
  return function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('events hooks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.resetAllMocks()
    queryClient = new QueryClient()
  })

  it('useEvents가 start/end 범위를 쿼리 파라미터로 전달한다', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { events: [sampleEvent] } })
    const range = { start: '2026-09-01T00:00:00.000Z', end: '2026-10-01T00:00:00.000Z' }

    const { result } = renderHook(() => useEvents(range), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/events', { params: range })
    expect(result.current.data).toEqual([sampleEvent])
  })

  it('useCreateEvent가 POST /events를 호출하고 events 캐시를 무효화한다', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { event: sampleEvent } })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateEvent(), {
      wrapper: makeWrapper(queryClient),
    })
    result.current.mutate({
      title: '운동',
      start: '2026-09-10T10:00:00.000Z',
      end: '2026-09-10T11:00:00.000Z',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/events', {
      title: '운동',
      start: '2026-09-10T10:00:00.000Z',
      end: '2026-09-10T11:00:00.000Z',
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events'] })
  })

  it('useUpdateEvent가 PUT /events/:id를 호출하고 캐시를 무효화한다', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({ data: { event: sampleEvent } })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateEvent(), {
      wrapper: makeWrapper(queryClient),
    })
    result.current.mutate({
      id: 'e1',
      input: { start: '2026-09-11T10:00:00.000Z', end: '2026-09-11T11:00:00.000Z' },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.put).toHaveBeenCalledWith('/events/e1', {
      start: '2026-09-11T10:00:00.000Z',
      end: '2026-09-11T11:00:00.000Z',
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events'] })
  })

  it('useDeleteEvent가 DELETE /events/:id를 호출하고 캐시를 무효화한다', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { ok: true } })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteEvent(), {
      wrapper: makeWrapper(queryClient),
    })
    result.current.mutate('e1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/events/e1')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['events'] })
  })
})
