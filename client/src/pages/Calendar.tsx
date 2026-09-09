import { cloneElement, isValidElement, useMemo, useState } from 'react'
import type { DragEvent, FormEvent, ReactElement, ReactNode } from 'react'
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/ko'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import {
  useCreateEvent,
  useDeleteEvent,
  useEvents,
  useUpdateEvent,
} from '@/api/events'
import { eventFormSchema } from '@/types/schemas'
import {
  applyMove,
  applyResizeEnd,
  applyResizeStart,
  readDragPayload,
  resolveDropDate,
  setDragPayload,
  writeDragPayload,
  type DragMode,
} from '@/lib/event-dnd'

moment.locale('ko')
const localizer = momentLocalizer(moment)

interface CalendarItem {
  id: string
  title: string
  description: string | null
  start: Date
  end: Date
}

type ModalState =
  | { kind: 'create'; start: Date; end: Date }
  | { kind: 'edit'; event: CalendarItem }
  | { kind: 'delete'; event: CalendarItem }
  | null

// datetime-local 입력값 ↔ Date 변환
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function handleDragStart(eventId: string, mode: DragMode) {
  return (e: DragEvent) => {
    // 리사이즈 핸들에서 시작된 드래그가 부모의 move 모드로 덮어쓰이지 않도록 전파를 막는다.
    e.stopPropagation()
    const payload = { eventId, mode }
    setDragPayload(payload)
    writeDragPayload(e.dataTransfer, payload)
  }
}

// 월간 뷰 이벤트 바: 가운데 드래그는 이동, 양끝 핸들 드래그는 기간 조절.
function MonthEvent({ event }: { event: CalendarItem }) {
  return (
    <div
      draggable
      data-event-id={event.id}
      title={event.title}
      onDragStart={handleDragStart(event.id, 'move')}
      onDragEnd={() => setDragPayload(null)}
      className="relative h-full w-full cursor-move select-none"
    >
      <span
        draggable
        aria-label="시작일 조절"
        onDragStart={handleDragStart(event.id, 'resize-start')}
        className="absolute left-0 top-0 z-10 h-full w-2 cursor-ew-resize"
      />
      <span className="pointer-events-none block truncate">{event.title}</span>
      <span
        draggable
        aria-label="종료일 조절"
        onDragStart={handleDragStart(event.id, 'resize-end')}
        className="absolute right-0 top-0 z-10 h-full w-2 cursor-ew-resize"
      />
    </div>
  )
}

// 각 날짜 셀에 data-rbc-date를 심어 드롭 대상 날짜를 알아낸다.
function MonthCell({ value, children }: { value: Date; children?: ReactNode }) {
  if (isValidElement(children)) {
    return cloneElement(children as ReactElement<Record<string, unknown>>, {
      'data-rbc-date': value.toISOString(),
    })
  }
  return <>{children}</>
}

interface EventModalProps {
  mode: 'create' | 'edit'
  initial: { title: string; description: string; start: string; end: string }
  pending: boolean
  onSubmit: (input: {
    title: string
    description?: string
    start: string
    end: string
  }) => void
  onDelete?: () => void
  onClose: () => void
}

function EventModal({ mode, initial, pending, onSubmit, onDelete, onClose }: EventModalProps) {
  const [form, setForm] = useState(initial)
  const [errors, setErrors] = useState<
    Partial<Record<'title' | 'description' | 'start' | 'end' | 'form', string>>
  >({})

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = eventFormSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const key = (issue.path[0] ?? 'form') as keyof typeof errors
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    onSubmit({
      title: parsed.data.title,
      description: parsed.data.description || undefined,
      start: new Date(parsed.data.start).toISOString(),
      end: new Date(parsed.data.end).toISOString(),
    })
  }

  const inputClass =
    'mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? '이벤트 생성' : '이벤트 수정'}
        className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
      >
        <h2 className="mb-4 text-lg font-bold text-card-foreground">
          {mode === 'create' ? '새 이벤트' : '이벤트 수정'}
        </h2>
        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          <div>
            <label htmlFor="event-title" className="block text-sm font-medium text-card-foreground">
              제목
            </label>
            <input
              id="event-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className={inputClass}
            />
            {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title}</p>}
          </div>
          <div>
            <label htmlFor="event-description" className="block text-sm font-medium text-card-foreground">
              설명
            </label>
            <textarea
              id="event-description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className={inputClass}
              rows={3}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-destructive">{errors.description}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-start" className="block text-sm font-medium text-card-foreground">
                시작
              </label>
              <input
                id="event-start"
                type="datetime-local"
                value={form.start}
                onChange={(e) => setForm((p) => ({ ...p, start: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="event-end" className="block text-sm font-medium text-card-foreground">
                종료
              </label>
              <input
                id="event-end"
                type="datetime-local"
                value={form.end}
                onChange={(e) => setForm((p) => ({ ...p, end: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          {errors.end && <p className="text-sm text-destructive">{errors.end}</p>}
          {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
          <div className="flex items-center justify-between pt-2">
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="rounded bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-input px-4 py-2 text-foreground hover:bg-accent"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                저장
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ConfirmDeleteModalProps {
  title: string
  pending: boolean
  onConfirm: () => void
  onClose: () => void
}

// 삭제는 되돌릴 수 없으므로 별도 확인 단계를 거친다.
function ConfirmDeleteModal({ title, pending, onConfirm, onClose }: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="이벤트 삭제 확인"
        className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg"
      >
        <h2 className="mb-2 text-lg font-bold text-card-foreground">이벤트 삭제</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          &quot;{title}&quot; 이벤트를 삭제하시겠습니까?
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-input px-4 py-2 text-foreground hover:bg-accent"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Calendar() {
  const [date, setDate] = useState(() => new Date())
  const [modal, setModal] = useState<ModalState>(null)

  // 보이는 달의 범위만 서버에 요청한다 (월 단위 조회).
  const range = useMemo(() => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
    return { start: start.toISOString(), end: end.toISOString() }
  }, [date])

  const eventsQuery = useEvents(range)
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()

  const items = useMemo<CalendarItem[]>(
    () =>
      (eventsQuery.data ?? []).map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        start: new Date(e.start),
        end: new Date(e.end),
      })),
    [eventsQuery.data],
  )

  const components = useMemo(
    () => ({ event: MonthEvent, dateCellWrapper: MonthCell }),
    [],
  )

  const openCreate = (start: Date, end: Date) => setModal({ kind: 'create', start, end })

  const handleSelectSlot = (slot: { start: string | Date; end: string | Date }) => {
    const start = new Date(slot.start)
    const rawEnd = new Date(slot.end)
    const end = rawEnd > start ? rawEnd : new Date(start.getTime() + 60 * 60 * 1000)
    openCreate(start, end)
  }

  const handleSelectEvent = (item: CalendarItem) => setModal({ kind: 'edit', event: item })

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  }

  // 드래그 앤 드롭/리사이즈 완료 시 변경된 start/end를 즉시 서버에 저장한다.
  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    const payload = readDragPayload(e.dataTransfer)
    setDragPayload(null)
    if (!payload) return

    const targetDate = resolveDropDate(e.target as HTMLElement, e.clientX, e.clientY)
    const item = items.find((i) => i.id === payload.eventId)
    if (!targetDate || !item) return

    let updated: { start: Date; end: Date } | null = null
    if (payload.mode === 'move') updated = applyMove(item.start, item.end, targetDate)
    else if (payload.mode === 'resize-start')
      updated = applyResizeStart(item.start, item.end, targetDate)
    else updated = applyResizeEnd(item.start, item.end, targetDate)
    if (!updated) return

    updateEvent.mutate({
      id: item.id,
      input: { start: updated.start.toISOString(), end: updated.end.toISOString() },
    })
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">캘린더</h1>
          <button
            type="button"
            onClick={() => {
              const now = new Date()
              openCreate(now, new Date(now.getTime() + 60 * 60 * 1000))
            }}
            className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            새 이벤트
          </button>
        </div>
        {eventsQuery.isLoading && (
          <p className="mb-2 text-sm text-muted-foreground">불러오는 중...</p>
        )}
        <div
          className="h-[640px] rounded-lg border bg-card p-2 text-card-foreground"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <BigCalendar
            localizer={localizer}
            events={items}
            date={date}
            onNavigate={(d) => setDate(d)}
            defaultView="month"
            views={['month']}
            selectable
            components={components}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            style={{ height: '100%' }}
            messages={{
              today: '오늘',
              previous: '이전',
              next: '다음',
              month: '월',
              week: '주',
              day: '일',
              agenda: '일정',
              showMore: (total: number) => `+${total}개 더`,
            }}
          />
        </div>
      </div>

      {modal?.kind === 'create' && (
        <EventModal
          mode="create"
          pending={createEvent.isPending}
          initial={{
            title: '',
            description: '',
            start: toLocalInput(modal.start),
            end: toLocalInput(modal.end),
          }}
          onSubmit={(input) =>
            createEvent.mutate(input, { onSuccess: () => setModal(null) })
          }
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'edit' && (
        <EventModal
          mode="edit"
          pending={updateEvent.isPending}
          initial={{
            title: modal.event.title,
            description: modal.event.description ?? '',
            start: toLocalInput(modal.event.start),
            end: toLocalInput(modal.event.end),
          }}
          onSubmit={(input) =>
            updateEvent.mutate(
              { id: modal.event.id, input },
              { onSuccess: () => setModal(null) },
            )
          }
          onDelete={() => setModal({ kind: 'delete', event: modal.event })}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'delete' && (
        <ConfirmDeleteModal
          title={modal.event.title}
          pending={deleteEvent.isPending}
          onConfirm={() =>
            deleteEvent.mutate(modal.event.id, { onSuccess: () => setModal(null) })
          }
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
