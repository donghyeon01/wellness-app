import { create } from 'zustand'
import type { PomodoroMode } from '@/types/schemas'

// UserSettings의 pomodoroFocus/pomodoroBreak 기본값(초)을 클라이언트 기본값으로 사용
export const DEFAULT_FOCUS_SECONDS = 1500 // 25분
export const DEFAULT_BREAK_SECONDS = 300 // 5분

interface PomodoroState {
  mode: PomodoroMode
  isRunning: boolean
  remainingSeconds: number
  focusDuration: number
  breakDuration: number
  focusCompleted: boolean
  start: () => void
  pause: () => void
  reset: () => void
  tick: () => void
  complete: () => void
  clearFocusCompleted: () => void
  switchMode: () => void
  setDurations: (focus: number, breakDuration: number) => void
}

export const usePomodoro = create<PomodoroState>((set) => ({
  mode: 'focus',
  isRunning: false,
  remainingSeconds: DEFAULT_FOCUS_SECONDS,
  focusDuration: DEFAULT_FOCUS_SECONDS,
  breakDuration: DEFAULT_BREAK_SECONDS,
  focusCompleted: false,

  start: () =>
    set((state) => {
      if (state.isRunning) return {}
      const currentDuration = state.mode === 'focus' ? state.focusDuration : state.breakDuration
      const remaining = state.remainingSeconds > 0 ? state.remainingSeconds : currentDuration
      return {
        isRunning: true,
        remainingSeconds: remaining,
      }
    }),

  pause: () => set({ isRunning: false }),

  reset: () =>
    set((state) => ({
      mode: 'focus',
      isRunning: false,
      remainingSeconds: state.focusDuration,
      focusCompleted: false,
    })),

  tick: () =>
    set((state) => {
      if (!state.isRunning || state.remainingSeconds <= 0) return {}
      const next = state.remainingSeconds - 1
      if (next <= 0) {
        return {
          isRunning: false,
          remainingSeconds: 0,
        }
      }
      return { remainingSeconds: next }
    }),

  complete: () =>
    set((state) => {
      if (state.mode === 'focus') {
        return {
          isRunning: false,
          mode: 'break',
          remainingSeconds: state.breakDuration,
          focusCompleted: true,
        }
      }
      return {
        isRunning: false,
        mode: 'focus',
        remainingSeconds: state.focusDuration,
        focusCompleted: false,
      }
    }),

  clearFocusCompleted: () => set({ focusCompleted: false }),

  switchMode: () =>
    set((state) => {
      const nextMode = state.mode === 'focus' ? 'break' : 'focus'
      return {
        isRunning: false,
        mode: nextMode,
        remainingSeconds: nextMode === 'focus' ? state.focusDuration : state.breakDuration,
        focusCompleted: false,
      }
    }),

  setDurations: (focus, breakDuration) =>
    set((state) => ({
      focusDuration: focus,
      breakDuration,
      remainingSeconds: !state.isRunning
        ? state.mode === 'focus'
          ? focus
          : breakDuration
        : state.remainingSeconds,
    })),
}))
