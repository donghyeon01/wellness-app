import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyMove,
  applyResizeEnd,
  applyResizeStart,
  getDragPayload,
  readDragPayload,
  resolveDropDate,
  setDragPayload,
  writeDragPayload,
} from '@/lib/event-dnd'

describe('event-dnd', () => {
  beforeEach(() => {
    setDragPayload(null)
  })

  describe('드래그 페이로드', () => {
    it('set/get으로 드래그 상태를 공유한다', () => {
      expect(getDragPayload()).toBeNull()
      setDragPayload({ eventId: 'e1', mode: 'move' })
      expect(getDragPayload()).toEqual({ eventId: 'e1', mode: 'move' })
      setDragPayload(null)
      expect(getDragPayload()).toBeNull()
    })

    it('모듈 상태가 없으면 dataTransfer에서 읽는다', () => {
      const store = new Map<string, string>()
      const dataTransfer = {
        setData: (type: string, value: string) => void store.set(type, value),
        getData: (type: string) => store.get(type) ?? '',
        effectAllowed: '',
      } as unknown as DataTransfer

      writeDragPayload(dataTransfer, { eventId: 'e9', mode: 'resize-end' })
      expect(readDragPayload(dataTransfer)).toEqual({ eventId: 'e9', mode: 'resize-end' })
    })
  })

  describe('applyMove', () => {
    it('기간 길이와 시각을 유지한 채 날짜만 이동한다', () => {
      const start = new Date(2026, 8, 10, 10, 0)
      const end = new Date(2026, 8, 10, 11, 30)
      const target = new Date(2026, 8, 15, 14, 45)

      const moved = applyMove(start, end, target)
      expect(moved.start.getFullYear()).toBe(2026)
      expect(moved.start.getMonth()).toBe(8)
      expect(moved.start.getDate()).toBe(15)
      expect(moved.start.getHours()).toBe(10)
      expect(moved.start.getMinutes()).toBe(0)
      expect(moved.end.getTime() - moved.start.getTime()).toBe(90 * 60 * 1000)
    })
  })

  describe('applyResizeEnd', () => {
    it('종료를 target 날짜의 끝으로 변경한다', () => {
      const start = new Date(2026, 8, 10, 10, 0)
      const end = new Date(2026, 8, 10, 11, 0)
      const result = applyResizeEnd(start, end, new Date(2026, 8, 12))

      expect(result).not.toBeNull()
      expect(result!.start.getTime()).toBe(start.getTime())
      expect(result!.end.getDate()).toBe(12)
      expect(result!.end.getHours()).toBe(23)
      expect(result!.end.getMinutes()).toBe(59)
    })

    it('시작보다 이른 날짜로는 리사이즈할 수 없다', () => {
      const start = new Date(2026, 8, 10, 10, 0)
      const end = new Date(2026, 8, 10, 11, 0)
      expect(applyResizeEnd(start, end, new Date(2026, 8, 9))).toBeNull()
    })
  })

  describe('applyResizeStart', () => {
    it('시작을 target 날짜의 시작으로 변경한다', () => {
      const start = new Date(2026, 8, 10, 10, 0)
      const end = new Date(2026, 8, 10, 11, 0)
      const result = applyResizeStart(start, end, new Date(2026, 8, 8, 15, 0))

      expect(result).not.toBeNull()
      expect(result!.start.getDate()).toBe(8)
      expect(result!.start.getHours()).toBe(0)
      expect(result!.end.getTime()).toBe(end.getTime())
    })

    it('종료 이후 날짜로는 리사이즈할 수 없다', () => {
      const start = new Date(2026, 8, 10, 10, 0)
      const end = new Date(2026, 8, 10, 11, 0)
      expect(applyResizeStart(start, end, new Date(2026, 8, 11))).toBeNull()
    })
  })

  describe('resolveDropDate', () => {
    it('data-rbc-date를 가진 조상에서 날짜를 읽는다', () => {
      const container = document.createElement('div')
      container.innerHTML =
        '<div class="rbc-month-view"><div class="rbc-day-bg" data-rbc-date="2026-09-15T00:00:00.000Z"><span id="t"></span></div></div>'
      document.body.appendChild(container)

      const target = container.querySelector('#t') as HTMLElement
      const date = resolveDropDate(target, 0, 0)
      expect(date?.toISOString()).toBe('2026-09-15T00:00:00.000Z')

      document.body.removeChild(container)
    })

    it('날짜 정보가 없으면 null을 반환한다', () => {
      const container = document.createElement('div')
      container.innerHTML = '<div class="rbc-month-view"><span id="t"></span></div>'
      document.body.appendChild(container)

      const target = container.querySelector('#t') as HTMLElement
      expect(resolveDropDate(target, 0, 0)).toBeNull()

      document.body.removeChild(container)
    })
  })
})
