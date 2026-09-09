import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import Memos from '@/pages/Memos'
import api from '@/lib/axios'

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// 실제 MDEditor는 jsdom에서 무겁게 동작하므로 최소 인터페이스로 대체한다.
vi.mock('@uiw/react-md-editor', () => {
  const MockMDEditor = (props: {
    value?: string
    onChange?: (value?: string) => void
  }) => (
    <textarea
      data-testid="md-editor"
      value={props.value}
      onChange={(e) => props.onChange?.(e.target.value)}
    />
  )
  MockMDEditor.Markdown = (props: { source?: string }) => (
    <div data-testid="md-preview">{props.source}</div>
  )
  return { default: MockMDEditor }
})

const queryClient = new QueryClient()

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

const memoList = [
  {
    id: 'm1',
    userId: 'u1',
    title: '업무 메모',
    content: '# 안녕',
    category: 'work',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'm2',
    userId: 'u1',
    title: '생활 메모',
    content: '**볼드**',
    category: 'life',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
]

function setupApi() {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/memos') return Promise.resolve({ data: { memos: memoList } })
    const found = memoList.find((m) => url === `/memos/${m.id}`)
    if (found) return Promise.resolve({ data: { memo: found } })
    return Promise.reject(new Error(`unexpected url: ${url}`))
  })
}

describe('Memos page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    queryClient.clear()
    setupApi()
  })

  it('메모 목록과 카테고리 필터가 렌더링된다', async () => {
    render(<Memos />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText('업무 메모')).toBeDefined()
      expect(screen.getByText('생활 메모')).toBeDefined()
    })

    const filter = screen.getByRole('combobox', { name: '카테고리' })
    expect(filter).toBeDefined()
    expect(screen.getByRole('option', { name: '전체' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'work' })).toBeDefined()
    expect(screen.getByRole('option', { name: 'life' })).toBeDefined()
  })

  it('메모를 선택하면 마크다운 미리보기가 렌더링된다', async () => {
    const user = userEvent.setup()
    render(<Memos />, { wrapper })

    await waitFor(() => expect(screen.getByText('업무 메모')).toBeDefined())
    await user.click(screen.getByText('업무 메모'))

    await waitFor(() => {
      expect(screen.getByTestId('md-preview').textContent).toBe('# 안녕')
    })
  })

  it('새 메모 버튼을 누르면 작성/미리보기 에디터가 표시된다', async () => {
    const user = userEvent.setup()
    render(<Memos />, { wrapper })

    await user.click(screen.getByRole('button', { name: '새 메모' }))
    expect(screen.getByTestId('md-editor')).toBeDefined()
    expect(screen.getByLabelText('제목')).toBeDefined()
  })

  it('폼 제출 시 생성 API를 호출한다', async () => {
    const user = userEvent.setup()
    const created = { ...memoList[0], id: 'm3', title: '새 제목', content: '본문' }
    vi.mocked(api.post).mockResolvedValueOnce({ data: { memo: created } })

    render(<Memos />, { wrapper })

    await user.click(screen.getByRole('button', { name: '새 메모' }))
    await user.type(screen.getByLabelText('제목'), '새 제목')
    await user.type(screen.getByTestId('md-editor'), '본문')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/memos', {
        title: '새 제목',
        content: '본문',
        category: undefined,
      })
    })
  })

  it('제목 없이 저장하면 검증 오류를 표시하고 API를 호출하지 않는다', async () => {
    const user = userEvent.setup()
    render(<Memos />, { wrapper })

    await user.click(screen.getByRole('button', { name: '새 메모' }))
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => {
      expect(screen.getByText('제목을 입력하세요.')).toBeDefined()
    })
    expect(api.post).not.toHaveBeenCalled()
  })

  it('삭제 버튼을 누르면 확인 후 삭제 API를 호출한다', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { ok: true } })

    render(<Memos />, { wrapper })

    await waitFor(() => expect(screen.getByText('업무 메모')).toBeDefined())
    await user.click(screen.getByText('업무 메모'))
    await waitFor(() => expect(screen.getByRole('button', { name: '삭제' })).toBeDefined())
    await user.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/memos/m1')
    })
  })
})
