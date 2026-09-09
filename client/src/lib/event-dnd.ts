/**
 * 캘린더 이벤트 드래그 앤 드롭/리사이즈 순수 로직.
 * react-big-calendar 공식 DnD 애드온(react-dnd 의존) 대신 HTML5 DnD로 구현하기 위해
 * 드래그 상태와 날짜 계산을 DOM과 분리해 둔다.
 */

export type DragMode = 'move' | 'resize-start' | 'resize-end'

export interface DragPayload {
  eventId: string
  mode: DragMode
}

const MIME = 'application/x-wellness-event'

// 진행 중인 드래그 상태. dataTransfer를 읽기 어려운 환경(테스트, 일부 브라우저)의 fallback이다.
let currentDrag: DragPayload | null = null

export function setDragPayload(payload: DragPayload | null): void {
  currentDrag = payload
}

export function getDragPayload(): DragPayload | null {
  return currentDrag
}

export function writeDragPayload(dataTransfer: DataTransfer | null, payload: DragPayload): void {
  try {
    dataTransfer?.setData(MIME, JSON.stringify(payload))
    dataTransfer?.setData('text/plain', payload.eventId)
    if (dataTransfer) dataTransfer.effectAllowed = 'move'
  } catch {
    // dataTransfer 미지원 환경에서는 모듈 상태만 사용한다.
  }
}

export function readDragPayload(dataTransfer: DataTransfer | null): DragPayload | null {
  if (currentDrag) return currentDrag
  try {
    const raw = dataTransfer?.getData(MIME)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DragPayload
    return parsed && typeof parsed.eventId === 'string' ? parsed : null
  } catch {
    return null
  }
}

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/** 이동: 기간 길이와 시각을 유지한 채 시작일만 target 날짜로 옮긴다. */
export function applyMove(start: Date, end: Date, target: Date): { start: Date; end: Date } {
  const duration = end.getTime() - start.getTime()
  const timeOfDay = start.getTime() - startOfDay(start).getTime()
  const newStart = new Date(startOfDay(target).getTime() + timeOfDay)
  return { start: newStart, end: new Date(newStart.getTime() + duration) }
}

/** 끝 리사이즈: 종료를 target 날짜의 끝으로. start >= end가 되면 null. */
export function applyResizeEnd(
  start: Date,
  _end: Date,
  target: Date,
): { start: Date; end: Date } | null {
  const newEnd = endOfDay(target)
  if (newEnd.getTime() <= start.getTime()) return null
  return { start: new Date(start), end: newEnd }
}

/** 시작 리사이즈: 시작을 target 날짜의 시작으로. start >= end가 되면 null. */
export function applyResizeStart(
  _start: Date,
  end: Date,
  target: Date,
): { start: Date; end: Date } | null {
  const newStart = startOfDay(target)
  if (newStart.getTime() >= end.getTime()) return null
  return { start: newStart, end: new Date(end) }
}

/**
 * 드롭 위치의 날짜를 찾는다.
 * 1) 드롭 대상이 data-rbc-date 셀 안이면 그 값 사용.
 * 2) 이벤트 바 위에 드롭한 경우(배경 셀이 가려짐) clientY로 월 행을 찾고 clientX로 열을 찾는다.
 */
export function resolveDropDate(
  target: HTMLElement,
  clientX: number,
  clientY: number,
): Date | null {
  const direct = target.closest<HTMLElement>('[data-rbc-date]')
  if (direct?.dataset.rbcDate) {
    const d = new Date(direct.dataset.rbcDate)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const view = target.closest('.rbc-month-view')
  if (!view) return null

  const rows = Array.from(view.querySelectorAll<HTMLElement>('.rbc-month-row'))
  const row = rows.find((r) => {
    const rect = r.getBoundingClientRect()
    return clientY >= rect.top && clientY <= rect.bottom
  })
  if (!row) return null

  const cells = Array.from(row.querySelectorAll<HTMLElement>('[data-rbc-date]'))
  const cell = cells.find((c) => {
    const rect = c.getBoundingClientRect()
    return clientX >= rect.left && clientX <= rect.right
  })
  const value = cell?.dataset.rbcDate
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}
