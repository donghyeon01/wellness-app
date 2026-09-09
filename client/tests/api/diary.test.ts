import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useDiaries,
  useDiary,
  useCreateDiary,
  useUpdateDiary,
  useDeleteDiary,
} from '@/api/diary'
import api from '@/lib/axios'
import type { Diary } from '@/types/schemas'

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

const mockDiary: Diary = {
  id: 'd1',
  userId: 'u1',
  mood: 'happy',
  content: '좋은 하루',
  date: '2024-09-09',
  createdAt: '2024-09-09T00:00:00.000Z',
  updatedAt: '2024-09-09T00:00:00.000Z',
}

describe('diary hooks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    queryClient.clear()
  })

  it('useDiaries가 월간 목록을 반환한다', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { diaries: [mockDiary] } })

    const { result } = renderHook(() => useDiaries('2024-09'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([mockDiary])
    expect(api.get).toHaveBeenCalledWith('/diaries', { params: { month: '2024-09' } })
  })

  it('useDiary가 날짜별 단건을 반환한다', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { diary: mockDiary } })

    const { result } = renderHook(() => useDiary('2024-09-09'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockDiary)
    expect(api.get).toHaveBeenCalledWith('/diaries/2024-09-09')
  })

  it('useDiary가 일기가 없으면 null을 반환한다', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { diary: null } })

    const { result } = renderHook(() => useDiary('2024-09-10'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('useCreateDiary가 일기를 생성한다', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { diary: mockDiary } })

    const { result } = renderHook(() => useCreateDiary(), { wrapper })
    result.current.mutate({
      date: '2024-09-09',
      mood: 'happy',
      content: '좋은 하루',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockDiary)
    expect(api.post).toHaveBeenCalledWith('/diaries', {
      date: '2024-09-09',
      mood: 'happy',
      content: '좋은 하루',
    })
  })

  it('useUpdateDiary가 일기를 수정한다', async () => {
    const updated = { ...mockDiary, mood: 'neutral', content: '보통' }
    vi.mocked(api.put).mockResolvedValueOnce({ data: { diary: updated } })

    const { result } = renderHook(() => useUpdateDiary(), { wrapper })
    result.current.mutate({ id: 'd1', input: { mood: 'neutral', content: '보통' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(updated)
    expect(api.put).toHaveBeenCalledWith('/diaries/d1', { mood: 'neutral', content: '보통' })
  })

  it('useDeleteDiary가 일기를 삭제한다', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { ok: true } })

    const { result } = renderHook(() => useDeleteDiary(), { wrapper })
    result.current.mutate('d1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/diaries/d1')
  })
})
