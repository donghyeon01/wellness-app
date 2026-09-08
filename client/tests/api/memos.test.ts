import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useMemos,
  useMemoDetail,
  useCreateMemo,
  useUpdateMemo,
  useDeleteMemo,
} from '@/api/memos'
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

const memoFixture = {
  id: 'm1',
  userId: 'u1',
  title: '메모',
  content: '# 내용',
  category: 'work',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('memo hooks', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    queryClient.clear()
  })

  it('useMemos가 카테고리 파라미터와 함께 목록을 조회한다', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { memos: [memoFixture] } })

    const { result } = renderHook(() => useMemos('work'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/memos', { params: { category: 'work' } })
    expect(result.current.data).toEqual([memoFixture])
  })

  it('useMemos는 카테고리 없이 전체 목록을 조회한다', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { memos: [memoFixture] } })

    const { result } = renderHook(() => useMemos(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/memos', { params: {} })
    expect(result.current.data).toEqual([memoFixture])
  })

  it('useMemoDetail이 단건을 조회한다', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { memo: memoFixture } })

    const { result } = renderHook(() => useMemoDetail('m1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/memos/m1')
    expect(result.current.data).toEqual(memoFixture)
  })

  it('useMemoDetail은 id가 없으면 요청하지 않는다', () => {
    renderHook(() => useMemoDetail(undefined), { wrapper })
    expect(api.get).not.toHaveBeenCalled()
  })

  it('useCreateMemo가 POST로 생성하고 memos 캐시를 무효화한다', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ data: { memo: memoFixture } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateMemo(), { wrapper })
    result.current.mutate({ title: '메모', content: '# 내용', category: 'work' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/memos', {
      title: '메모',
      content: '# 내용',
      category: 'work',
    })
    expect(result.current.data).toEqual(memoFixture)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['memos'] })
  })

  it('useUpdateMemo가 PUT으로 수정하고 memos 캐시를 무효화한다', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({ data: { memo: memoFixture } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateMemo(), { wrapper })
    result.current.mutate({ id: 'm1', title: '수정됨', content: '바뀐 내용' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.put).toHaveBeenCalledWith('/memos/m1', { title: '수정됨', content: '바뀐 내용' })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['memos'] })
  })

  it('useDeleteMemo가 DELETE로 삭제하고 memos 캐시를 무효화한다', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { ok: true } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteMemo(), { wrapper })
    result.current.mutate('m1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/memos/m1')
    expect(result.current.data).toBe(true)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['memos'] })
  })
})
