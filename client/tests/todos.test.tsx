import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import Todos from '@/pages/Todos'
import type { Todo, TodoFilters } from '@/types/schemas'

const mocks = vi.hoisted(() => ({
  useTodos: vi.fn(),
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  deleteMutate: vi.fn(),
}))

vi.mock('@/api/todos', () => ({
  useTodos: (filters: TodoFilters) => mocks.useTodos(filters),
  useTodo: () => ({ data: undefined }),
  useCreateTodo: () => ({ mutate: mocks.createMutate, isPending: false }),
  useUpdateTodo: () => ({ mutate: mocks.updateMutate, isPending: false }),
  useDeleteTodo: () => ({ mutate: mocks.deleteMutate, isPending: false }),
}))

const todos: Todo[] = [
  {
    id: 't1',
    userId: 'u1',
    title: '운동하기',
    description: '30분 달리기',
    priority: 2,
    dueDate: '2026-01-05T00:00:00.000Z',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 't2',
    userId: 'u1',
    title: '독서',
    description: null,
    priority: 0,
    dueDate: null,
    completed: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  mocks.useTodos.mockReturnValue({ data: todos, isLoading: false, error: null })
})

describe('Todos 페이지', () => {
  it('TODO 목록을 렌더링한다', () => {
    render(<Todos />)

    expect(screen.getByText('운동하기')).toBeInTheDocument()
    expect(screen.getByText('독서')).toBeInTheDocument()
    expect(screen.getByText('30분 달리기')).toBeInTheDocument()
    // 우선순위 라벨은 폼/필터 select 옵션과 목록 배지에 중복되므로 복수 매칭을 허용한다.
    expect(screen.getAllByText('높음').length).toBeGreaterThan(0)
    expect(screen.getAllByText('낮음').length).toBeGreaterThan(0)
  })

  it('완료 필터를 변경하면 useTodos에 반영된다', async () => {
    const user = userEvent.setup()
    render(<Todos />)

    await user.selectOptions(screen.getByLabelText('완료'), 'completed')

    const lastCall = mocks.useTodos.mock.calls.at(-1)?.[0] as TodoFilters
    expect(lastCall).toEqual({ completed: 'completed', priority: 'all' })
  })

  it('우선순위 필터를 변경하면 useTodos에 반영된다', async () => {
    const user = userEvent.setup()
    render(<Todos />)

    await user.selectOptions(screen.getByLabelText('우선순위'), '2')

    const lastCall = mocks.useTodos.mock.calls.at(-1)?.[0] as TodoFilters
    expect(lastCall).toEqual({ completed: 'all', priority: '2' })
  })

  it('생성 폼을 제출하면 create 뮤테이션이 호출된다', async () => {
    const user = userEvent.setup()
    render(<Todos />)

    await user.type(screen.getByLabelText('제목'), '장보기')
    await user.selectOptions(screen.getByLabelText('중요도'), '2')
    await user.click(screen.getByRole('button', { name: '생성' }))

    expect(mocks.createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ title: '장보기', priority: 2 }),
      expect.anything(),
    )
  })

  it('제목 없이 제출하면 검증 오류를 표시하고 뮤테이션을 호출하지 않는다', async () => {
    const user = userEvent.setup()
    render(<Todos />)

    await user.click(screen.getByRole('button', { name: '생성' }))

    expect(mocks.createMutate).not.toHaveBeenCalled()
    expect(screen.getByText('제목을 입력하세요.')).toBeInTheDocument()
  })

  it('체크박스로 완료 상태를 토글한다', async () => {
    const user = userEvent.setup()
    render(<Todos />)

    // 미완료 항목(t1)의 체크박스만 '완료로 변경' 레이블을 가진다.
    await user.click(screen.getByLabelText('완료로 변경'))

    expect(mocks.updateMutate).toHaveBeenCalledWith({
      id: 't1',
      input: { completed: true },
    })
  })

  it('수정 버튼으로 폼을 채우고 제출하면 update 뮤테이션이 호출된다', async () => {
    const user = userEvent.setup()
    render(<Todos />)

    await user.click(screen.getAllByRole('button', { name: '수정' })[0])
    expect(screen.getByText('TODO 수정')).toBeInTheDocument()

    const titleInput = screen.getByLabelText('제목')
    expect(titleInput).toHaveValue('운동하기')

    await user.clear(titleInput)
    await user.type(titleInput, '운동하기(수정)')

    // 수정 모드에서는 목록 항목에도 '수정' 버튼이 있으므로 폼 내부의 제출 버튼을 찾는다.
    const form = titleInput.closest('form')!
    await user.click(within(form).getByRole('button', { name: '수정' }))

    expect(mocks.updateMutate).toHaveBeenCalledWith(
      { id: 't1', input: expect.objectContaining({ title: '운동하기(수정)' }) },
      expect.anything(),
    )
  })

  it('수정 모드에서 취소하면 생성 폼으로 돌아온다', async () => {
    const user = userEvent.setup()
    render(<Todos />)

    await user.click(screen.getAllByRole('button', { name: '수정' })[0])
    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(screen.getByText('새 TODO')).toBeInTheDocument()
    expect(screen.getByLabelText('제목')).toHaveValue('')
  })

  it('삭제 버튼을 누르면 delete 뮤테이션이 호출된다', async () => {
    const user = userEvent.setup()
    render(<Todos />)

    await user.click(screen.getAllByRole('button', { name: '삭제' })[0])

    expect(mocks.deleteMutate).toHaveBeenCalledWith('t1')
  })

  it('목록이 비어 있으면 안내 메시지를 표시한다', () => {
    mocks.useTodos.mockReturnValue({ data: [], isLoading: false, error: null })
    render(<Todos />)

    expect(screen.getByText('할 일이 없습니다.')).toBeInTheDocument()
  })
})
