import { useEffect, useState } from 'react'
import { usePomodoro } from '@/stores/pomodoro'
import { useCreatePomodoroSession, usePomodoroStats } from '@/api/pomodoro'

function formatSeconds(total: number) {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function clampDuration(minutes: number) {
  return Math.max(1, Math.min(120, Math.floor(minutes || 0)))
}

export default function Pomodoro() {
  const {
    mode,
    isRunning,
    remainingSeconds,
    focusDuration,
    breakDuration,
    focusCompleted,
    start,
    pause,
    reset,
    tick,
    complete,
    clearFocusCompleted,
    switchMode,
    setDurations,
  } = usePomodoro()

  const { mutate: createSession } = useCreatePomodoroSession()
  const { data: stats } = usePomodoroStats('day')

  const [focusInput, setFocusInput] = useState(Math.floor(focusDuration / 60))
  const [breakInput, setBreakInput] = useState(Math.floor(breakDuration / 60))

  useEffect(() => {
    setFocusInput(Math.floor(focusDuration / 60))
    setBreakInput(Math.floor(breakDuration / 60))
  }, [focusDuration, breakDuration])

  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      tick()
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, tick])

  useEffect(() => {
    if (remainingSeconds === 0 && !isRunning && !focusCompleted) {
      complete()
    }
  }, [remainingSeconds, isRunning, focusCompleted, complete])

  useEffect(() => {
    if (focusCompleted) {
      createSession({ duration: focusDuration, type: 'focus' })
      clearFocusCompleted()
    }
  }, [focusCompleted, focusDuration, createSession, clearFocusCompleted])

  const handleStartPause = () => {
    if (isRunning) {
      pause()
    } else {
      start()
    }
  }

  const handleApplyDurations = () => {
    const focus = clampDuration(focusInput) * 60
    const breakDur = clampDuration(breakInput) * 60
    setDurations(focus, breakDur)
  }

  return (
    <div className="min-h-screen bg-background p-4 text-foreground md:p-8">
      <div className="mx-auto w-full max-w-md space-y-6 rounded-lg border bg-card p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-card-foreground">뽀모도로 타이머</h1>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              mode === 'focus' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {mode === 'focus' ? '집중' : '휴식'}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-7xl font-bold tabular-nums tracking-tight text-card-foreground" aria-live="polite">
            {formatSeconds(remainingSeconds)}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {isRunning ? '진행 중...' : '일시정지됨'}
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={handleStartPause}
            className="rounded bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            disabled={remainingSeconds === 0}
          >
            {isRunning ? '일시정지' : '시작'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded border border-input bg-background px-6 py-2 text-foreground hover:bg-muted"
          >
            리셋
          </button>
          <button
            type="button"
            onClick={switchMode}
            disabled={isRunning}
            className="rounded border border-input bg-background px-6 py-2 text-foreground hover:bg-muted disabled:opacity-50"
          >
            {mode === 'focus' ? '휴식 모드' : '집중 모드'}
          </button>
        </div>

        <div className="space-y-4 rounded border border-input bg-background p-4">
          <h2 className="text-sm font-medium text-card-foreground">시간 설정(분)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="focus-minutes" className="block text-sm text-muted-foreground">
                집중
              </label>
              <input
                id="focus-minutes"
                type="number"
                min={1}
                max={120}
                value={focusInput}
                onChange={(e) => setFocusInput(Number(e.target.value))}
                disabled={isRunning}
                className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
              />
            </div>
            <div>
              <label htmlFor="break-minutes" className="block text-sm text-muted-foreground">
                휴식
              </label>
              <input
                id="break-minutes"
                type="number"
                min={1}
                max={120}
                value={breakInput}
                onChange={(e) => setBreakInput(Number(e.target.value))}
                disabled={isRunning}
                className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleApplyDurations}
            disabled={isRunning}
            className="w-full rounded bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/90 disabled:opacity-50"
          >
            적용
          </button>
        </div>

        {stats && (
          <div className="rounded border border-input bg-background p-4">
            <h2 className="text-sm font-medium text-card-foreground">오늘 집중 통계</h2>
            <p className="mt-1 text-2xl font-bold text-card-foreground">
              {formatSeconds(stats.totalSeconds)}
            </p>
            <p className="text-xs text-muted-foreground">완료한 세션: {stats.count}개</p>
          </div>
        )}
      </div>
    </div>
  )
}
