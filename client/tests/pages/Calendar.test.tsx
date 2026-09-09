import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CalendarPage from '@/pages/Calendar'
import { setDragPayload, applyMove, applyResizeEnd, applyResizeStart } from '@/lib/event-dnd'

interface TestEvent {
  id: string
  title: string
  description: string | null
  start: string
  end: string
}

const mocks = vi.hoisted(() => ({
  captured: {} as Record<string, unknown>,
  events: [] as TestEvent[],
  lastRange: undefined as { start?: string; end?: string } | undefined,
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  deleteMutate: vi.fn(),
}))

vi.mock('@/api/events', () => ({
  useEvents: (range: { start?: string; end?: string }) => {
    mocks.lastRange = range
    return { data: mocks.events, isLoading: false }
  },
  useCreateEvent: () => ({ mutate: mocks.createMutate, isPending: false }),
  useUpdateEvent: () => ({ mutate: mocks.updateMutate, isPending: false }),
  useDeleteEvent: () => ({ mutate: mocks.deleteMutate, isPending: false }),
}))

// react-big-calendar 스텁: props를 캡처하고 data-rbc-date 셀을 렌더링해 드롭을 시뮬레이션한다.
vi.mock('react-big-calendar', async () => {
  const { createElement } = await import('react')
  return {
    momentLocalizer: () => ({}),
    Calendar: (props: Record<string, unknown>) => {
      mocks.captured = props
      return createElement(
        'div',
        { 'data-testid': 'rbc', className: 'rbc-month-view' },
        createElement(
          'div',
          {
            className: 'rbc-day-bg',
            'data-rbc-date': '2026-09-15T00:00:00.000Z',
          },
          createElement('button', { 'data-testid': 'drop-cell', type: 'button' }),
        ),
        createElement(
          'div',
          {
            className: 'rbc-day-bg',
            'data-rbc-date': '2026-09-08T00:00:00.000Z',
          },
          createElement('button', { 'data-testid': 'drop-cell-early', type: 'button' }),
        ),
        createElement('div', { 'data-testid': 'no-date' }),
      )
    },
  }
})

const queryClient = new QueryClient()

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <CalendarPage />
    </QueryClientProvider>,
  )
}

const sampleEvent: TestEvent = {
  id: 'e1',
  title: '운동',
  description: null,
  start: '2026-09-10T10:00:00.000Z',
  end: '2026-09-10T11:00:00.000Z',
}

describe('Calendar 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    mocks.events = []
    mocks.captured = {}
    mocks.lastRange = undefined
    setDragPayload(null)
  })

  it('현재 월 범위로 이벤트를 조회한다', () => {
    renderPage()

    expect(mocks.lastRange?.start).toBeDefined()
    const start = new Date(mocks.lastRange!.start!)
    const end = new Date(mocks.lastRange!.end!)
    expect(start.getDate()).toBe(1)
    expect(end.getTime() - start.getTime()).toBeGreaterThan(27 * 24 * 60 * 60 * 1000)
  })

  it('새 이벤트 버튼으로 생성 모달을 열고 저장하면 createEvent가 호출된다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '새 이벤트' }))

    const dialog = screen.getByRole('dialog', { name: '이벤트 생성' })
    fireEvent.change(within(dialog).getByLabelText('제목'), {
      target: { value: '저녁 약속' },
    })
    fireEvent.change(within(dialog).getByLabelText('시작'), {
      target: { value: '2026-09-10T19:00' },
    })
    fireEvent.change(within(dialog).getByLabelText('종료'), {
      target: { value: '2026-09-10T20:00' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(mocks.createMutate).toHaveBeenCalledTimes(1)
    const input = mocks.createMutate.mock.calls[0][0] as {
      title: string
      start: string
      end: string
    }
    expect(input.title).toBe('저녁 약속')
    expect(new Date(input.start).getTime()).toBe(new Date('2026-09-10T19:00').getTime())
    expect(new Date(input.end).getTime()).toBe(new Date('2026-09-10T20:00').getTime())
  })

  it('종료가 시작보다 빠르면 검증 오류를 표시하고 저장하지 않는다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '새 이벤트' }))

    const dialog = screen.getByRole('dialog', { name: '이벤트 생성' })
    fireEvent.change(within(dialog).getByLabelText('제목'), {
      target: { value: '잘못된 일정' },
    })
    fireEvent.change(within(dialog).getByLabelText('시작'), {
      target: { value: '2026-09-10T20:00' },
    })
    fireEvent.change(within(dialog).getByLabelText('종료'), {
      target: { value: '2026-09-10T19:00' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(mocks.createMutate).not.toHaveBeenCalled()
    expect(
      within(dialog).getByText('종료 시각은 시작 시각보다 뒤여야 합니다.'),
    ).toBeTruthy()
  })

  it('이벤트를 선택하면 수정 모달이 열리고 삭제 확인 후 deleteEvent가 호출된다', () => {
    mocks.events = [sampleEvent]
    renderPage()

    const onSelectEvent = mocks.captured.onSelectEvent as (e: unknown) => void
    act(() =>
      onSelectEvent({
        id: sampleEvent.id,
        title: sampleEvent.title,
        description: null,
        start: new Date(sampleEvent.start),
        end: new Date(sampleEvent.end),
      }),
    )

    const editDialog = screen.getByRole('dialog', { name: '이벤트 수정' })
    fireEvent.click(within(editDialog).getByRole('button', { name: '삭제' }))

    const confirmDialog = screen.getByRole('dialog', { name: '이벤트 삭제 확인' })
    fireEvent.click(within(confirmDialog).getByRole('button', { name: '삭제' }))

    expect(mocks.deleteMutate).toHaveBeenCalledWith('e1', expect.anything())
  })

  it('드래그 앤 드롭으로 이벤트를 이동하면 서버에 자동 저장된다', () => {
    mocks.events = [sampleEvent]
    renderPage()

    setDragPayload({ eventId: 'e1', mode: 'move' })
    fireEvent.drop(screen.getByTestId('drop-cell'))

    const expected = applyMove(
      new Date(sampleEvent.start),
      new Date(sampleEvent.end),
      new Date('2026-09-15T00:00:00.000Z'),
    )
    expect(mocks.updateMutate).toHaveBeenCalledWith({
      id: 'e1',
      input: {
        start: expected.start.toISOString(),
        end: expected.end.toISOString(),
      },
    })
  })

  it('끝 리사이즈 드롭은 종료일을 연장해 저장한다', () => {
    mocks.events = [sampleEvent]
    renderPage()

    setDragPayload({ eventId: 'e1', mode: 'resize-end' })
    fireEvent.drop(screen.getByTestId('drop-cell'))

    const expected = applyResizeEnd(
      new Date(sampleEvent.start),
      new Date(sampleEvent.end),
      new Date('2026-09-15T00:00:00.000Z'),
    )
    expect(expected).not.toBeNull()
    expect(mocks.updateMutate).toHaveBeenCalledWith({
      id: 'e1',
      input: {
        start: expected!.start.toISOString(),
        end: expected!.end.toISOString(),
      },
    })
  })

  it('시작 리사이즈 드롭은 시작일을 당겨 저장한다', () => {
    mocks.events = [sampleEvent]
    renderPage()

    setDragPayload({ eventId: 'e1', mode: 'resize-start' })
    fireEvent.drop(screen.getByTestId('drop-cell-early'))

    const expected = applyResizeStart(
      new Date(sampleEvent.start),
      new Date(sampleEvent.end),
      new Date('2026-09-08T00:00:00.000Z'),
    )
    expect(expected).not.toBeNull()
    expect(mocks.updateMutate).toHaveBeenCalledWith({
      id: 'e1',
      input: {
        start: expected!.start.toISOString(),
        end: expected!.end.toISOString(),
      },
    })
  })

  it('시작을 종료 이후로 리사이즈하면 저장하지 않는다', () => {
    mocks.events = [sampleEvent]
    renderPage()

    // 9/15로 시작을 옮기면 종료(9/10)보다 늦어져 applyResizeStart가 null을 반환한다.
    setDragPayload({ eventId: 'e1', mode: 'resize-start' })
    fireEvent.drop(screen.getByTestId('drop-cell'))

    expect(mocks.updateMutate).not.toHaveBeenCalled()
  })

  it('날짜 셀이 아닌 곳에 드롭하면 저장하지 않는다', () => {
    mocks.events = [sampleEvent]
    renderPage()

    setDragPayload({ eventId: 'e1', mode: 'move' })
    fireEvent.drop(screen.getByTestId('no-date'))

    expect(mocks.updateMutate).not.toHaveBeenCalled()
  })
})
