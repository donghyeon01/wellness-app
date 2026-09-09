import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePomodoro, DEFAULT_FOCUS_SECONDS, DEFAULT_BREAK_SECONDS } from '@/stores/pomodoro'

describe('usePomodoro store', () => {
  beforeEach(() => {
    act(() => {
      usePomodoro.getState().reset()
    })
  })

  it('기본값으로 집중 모드와 25분이 설정된다', () => {
    const { result } = renderHook(() => usePomodoro())
    expect(result.current.mode).toBe('focus')
    expect(result.current.isRunning).toBe(false)
    expect(result.current.remainingSeconds).toBe(DEFAULT_FOCUS_SECONDS)
    expect(result.current.focusDuration).toBe(DEFAULT_FOCUS_SECONDS)
    expect(result.current.breakDuration).toBe(DEFAULT_BREAK_SECONDS)
  })

  it('start/pause로 타이머를 시작하고 일시정지한다', () => {
    const { result } = renderHook(() => usePomodoro())

    act(() => {
      result.current.start()
    })
    expect(result.current.isRunning).toBe(true)

    act(() => {
      result.current.pause()
    })
    expect(result.current.isRunning).toBe(false)
  })

  it('tick으로 남은 시간이 1초씩 줄어든다', () => {
    const { result } = renderHook(() => usePomodoro())

    act(() => {
      result.current.setDurations(5, 300)
      result.current.start()
      result.current.tick()
    })

    expect(result.current.remainingSeconds).toBe(4)
    expect(result.current.isRunning).toBe(true)
  })

  it('시간이 0이 되면 자동으로 일시정지된다', () => {
    const { result } = renderHook(() => usePomodoro())

    act(() => {
      result.current.setDurations(1, 300)
      result.current.start()
      result.current.tick()
    })

    expect(result.current.remainingSeconds).toBe(0)
    expect(result.current.isRunning).toBe(false)
  })

  it('집중 완료 시 휴식 모드로 전환되고 focusCompleted가 true가 된다', () => {
    const { result } = renderHook(() => usePomodoro())

    act(() => {
      result.current.complete()
    })

    expect(result.current.mode).toBe('break')
    expect(result.current.focusCompleted).toBe(true)
    expect(result.current.remainingSeconds).toBe(DEFAULT_BREAK_SECONDS)
  })

  it('clearFocusCompleted로 플래그를 해제한다', () => {
    const { result } = renderHook(() => usePomodoro())

    act(() => {
      result.current.complete()
      result.current.clearFocusCompleted()
    })

    expect(result.current.focusCompleted).toBe(false)
  })

  it('switchMode로 모드를 전환한다', () => {
    const { result } = renderHook(() => usePomodoro())

    act(() => {
      result.current.switchMode()
    })

    expect(result.current.mode).toBe('break')
    expect(result.current.remainingSeconds).toBe(DEFAULT_BREAK_SECONDS)
  })

  it('setDurations으로 집중/휴식 시간을 변경한다', () => {
    const { result } = renderHook(() => usePomodoro())

    act(() => {
      result.current.setDurations(1800, 600)
    })

    expect(result.current.focusDuration).toBe(1800)
    expect(result.current.breakDuration).toBe(600)
    expect(result.current.remainingSeconds).toBe(1800)
  })

  it('reset으로 초기 상태로 되돌린다', () => {
    const { result } = renderHook(() => usePomodoro())

    act(() => {
      result.current.setDurations(900, 180)
      result.current.switchMode()
      result.current.start()
      result.current.reset()
    })

    expect(result.current.mode).toBe('focus')
    expect(result.current.isRunning).toBe(false)
    expect(result.current.remainingSeconds).toBe(900)
  })
})
