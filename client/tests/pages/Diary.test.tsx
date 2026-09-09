import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Diary from '@/pages/Diary'

const queryClient = new QueryClient()

const createMock = vi.fn()
const updateMock = vi.fn()
const deleteMock = vi.fn()

vi.mock('@/api/diary', () => ({
  useDiary: vi.fn(),
  useDiaries: vi.fn(),
  useCreateDiary: vi.fn(),
  useUpdateDiary: vi.fn(),
  useDeleteDiary: vi.fn(),
}))

import { useDiary, useDiaries, useCreateDiary, useUpdateDiary, useDeleteDiary } from '@/api/diary'

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function setup({
  diary = null,
  diaries = [],
}: {
  diary?: { id: string; mood: string; content: string; date: string } | null
  diaries?: { id: string; mood: string; content: string; date: string }[]
} = {}) {
  vi.mocked(useDiary).mockReturnValue({ data: diary, isLoading: false } as ReturnType<typeof useDiary>)
  vi.mocked(useDiaries).mockReturnValue({ data: diaries, isLoading: false } as ReturnType<typeof useDiaries>)
  vi.mocked(useCreateDiary).mockReturnValue({
    mutate: createMock,
    isPending: false,
  } as unknown as ReturnType<typeof useCreateDiary>)
  vi.mocked(useUpdateDiary).mockReturnValue({
    mutate: updateMock,
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateDiary>)
  vi.mocked(useDeleteDiary).mockReturnValue({
    mutate: deleteMock,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteDiary>)
}

describe('Diary page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    queryClient.clear()
    createMock.mockClear()
    updateMock.mockClear()
    deleteMock.mockClear()
    setup()
  })

  it('감정 5종 버튼과 내용 입력란이 렌더링된다', () => {
    render(<Diary />, { wrapper })

    expect(screen.getByRole('button', { name: '행복' })).toBeDefined()
    expect(screen.getByRole('button', { name: '보통' })).toBeDefined()
    expect(screen.getByRole('button', { name: '슬픔' })).toBeDefined()
    expect(screen.getByRole('button', { name: '분노' })).toBeDefined()
    expect(screen.getByRole('button', { name: '불안' })).toBeDefined()
    expect(screen.getByLabelText('내용')).toBeDefined()
  })

  it('내용을 입력하지 않고 저장하면 검증 오류를 표시한다', async () => {
    const user = userEvent.setup()
    render(<Diary />, { wrapper })

    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => {
      expect(screen.getByText('내용을 입력하세요.')).toBeDefined()
    })
  })

  it('감정과 내용을 입력하고 저장하면 createDiary를 호출한다', async () => {
    const user = userEvent.setup()
    render(<Diary />, { wrapper })

    await user.click(screen.getByRole('button', { name: '행복' }))
    await user.type(screen.getByLabelText('내용'), '오늘은 기분이 좋았다.')

    const saveButton = screen.getByRole('button', { name: '저장' })
    await user.click(saveButton)

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          mood: 'happy',
          content: '오늘은 기분이 좋았다.',
        }),
        expect.any(Object),
      )
    })
  })

  it('기존 일기가 있으면 수정/삭제 버튼을 표시한다', () => {
    setup({
      diary: {
        id: 'd1',
        mood: 'sad',
        content: '힘든 하루',
        date: '2024-09-09',
      },
    })

    render(<Diary />, { wrapper })

    expect(screen.getByRole('button', { name: '수정' })).toBeDefined()
    expect(screen.getByRole('button', { name: '삭제' })).toBeDefined()
  })

  it('기존 일기를 수정하면 updateDiary를 호출한다', async () => {
    const user = userEvent.setup()
    setup({
      diary: {
        id: 'd1',
        mood: 'sad',
        content: '힘든 하루',
        date: '2024-09-09',
      },
    })

    render(<Diary />, { wrapper })

    await user.click(screen.getByRole('button', { name: '행복' }))
    await user.clear(screen.getByLabelText('내용'))
    await user.type(screen.getByLabelText('내용'), '수정된 내용')

    await user.click(screen.getByRole('button', { name: '수정' }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'd1',
          input: { mood: 'happy', content: '수정된 내용' },
        }),
        expect.any(Object),
      )
    })
  })

  it('기존 일기를 삭제하면 deleteDiary를 호출한다', async () => {
    const user = userEvent.setup()
    setup({
      diary: {
        id: 'd1',
        mood: 'sad',
        content: '힘든 하루',
        date: '2024-09-09',
      },
    })

    render(<Diary />, { wrapper })

    await user.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('d1', expect.any(Object))
    })
  })
})
