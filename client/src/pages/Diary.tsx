import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { cn } from '@/lib/utils'
import { useDiaries, useDiary, useCreateDiary, useUpdateDiary, useDeleteDiary } from '@/api/diary'
import { diaryCreateSchema, diaryUpdateSchema, type Mood } from '@/types/schemas'

const MOOD_OPTIONS: { value: Mood; label: string; color: string }[] = [
  { value: 'happy', label: '행복', color: 'bg-green-100 text-green-800 ring-green-300' },
  { value: 'neutral', label: '보통', color: 'bg-gray-100 text-gray-800 ring-gray-300' },
  { value: 'sad', label: '슬픔', color: 'bg-blue-100 text-blue-800 ring-blue-300' },
  { value: 'angry', label: '분노', color: 'bg-red-100 text-red-800 ring-red-300' },
  { value: 'anxious', label: '불안', color: 'bg-purple-100 text-purple-800 ring-purple-300' },
]

function toDateString(date: Date): string {
  return date.toLocaleDateString('sv-SE')
}

export default function Diary() {
  const [selectedDate, setSelectedDate] = useState<string>(() => toDateString(new Date()))
  const [mood, setMood] = useState<Mood>('neutral')
  const [content, setContent] = useState('')
  const [loadedDiaryId, setLoadedDiaryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const month = selectedDate.slice(0, 7)
  const { data: diary, isLoading: isDiaryLoading } = useDiary(selectedDate)
  const { data: diaries = [], isLoading: isListLoading } = useDiaries(month)
  const { mutate: createDiary, isPending: isCreating } = useCreateDiary()
  const { mutate: updateDiary, isPending: isUpdating } = useUpdateDiary()
  const { mutate: deleteDiary, isPending: isDeleting } = useDeleteDiary()

  const isBusy = isCreating || isUpdating || isDeleting

  useEffect(() => {
    if (diary) {
      if (diary.id !== loadedDiaryId) {
        setMood(diary.mood as Mood)
        setContent(diary.content)
        setLoadedDiaryId(diary.id)
        setError(null)
      }
    } else if (loadedDiaryId !== null) {
      setMood('neutral')
      setContent('')
      setLoadedDiaryId(null)
      setError(null)
    }
  }, [diary, loadedDiaryId])

  const validate = () => {
    if (diary) {
      const parsed = diaryUpdateSchema.safeParse({ mood, content })
      if (!parsed.success) {
        setError(parsed.error.errors[0].message)
        return false
      }
      return true
    }

    const parsed = diaryCreateSchema.safeParse({ date: selectedDate, mood, content })
    if (!parsed.success) {
      setError(parsed.error.errors[0].message)
      return false
    }
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validate()) {
      return
    }

    if (diary) {
      const payload = { mood, content }
      updateDiary(
        { id: diary.id, input: payload },
        {
          onError: (err) => {
            if (isAxiosError(err) && err.response?.data?.error) {
              setError(err.response.data.error)
            } else {
              setError('일기 수정 중 오류가 발생했습니다.')
            }
          },
        },
      )
      return
    }

    createDiary(
      { date: selectedDate, mood, content },
      {
        onError: (err) => {
          if (isAxiosError(err) && err.response?.status === 409) {
            setError(err.response.data?.error ?? '동일한 날짜의 일기가 이미 존재합니다.')
          } else if (isAxiosError(err) && err.response?.data?.error) {
            setError(err.response.data.error)
          } else {
            setError('일기 저장 중 오류가 발생했습니다.')
          }
        },
      },
    )
  }

  const handleDelete = () => {
    if (!diary) return
    setError(null)
    deleteDiary(diary.id, {
      onError: (err) => {
        if (isAxiosError(err) && err.response?.data?.error) {
          setError(err.response.data.error)
        } else {
          setError('일기 삭제 중 오류가 발생했습니다.')
        }
      },
    })
  }

  const changeMonth = (offset: number) => {
    const [year, monthIndex] = month.split('-').map(Number)
    const next = new Date(Date.UTC(year, monthIndex - 1 + offset, 1))
    setSelectedDate(toDateString(next))
  }

  const getMood = (value: Mood) => MOOD_OPTIONS.find((m) => m.value === value) ?? MOOD_OPTIONS[1]

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-foreground">일기</h1>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4 rounded-lg border bg-card p-6 shadow-sm"
        >
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-card-foreground">
              날짜
            </label>
            <input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setMood('neutral')
                setContent('')
                setLoadedDiaryId(null)
                setError(null)
              }}
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-card-foreground">감정</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMood(option.value)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium ring-2 ring-transparent transition',
                    option.color,
                    mood === option.value ? 'ring-offset-2 ring-offset-card ring-current' : 'opacity-70',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-card-foreground">
              내용
            </label>
            <textarea
              id="content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isBusy || isDiaryLoading}
              className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isBusy ? '처리 중...' : diary ? '수정' : '저장'}
            </button>
            {diary && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isBusy}
                className="rounded bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            )}
          </div>
        </form>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => changeMonth(-1)}
              className="rounded border p-2 text-sm hover:bg-muted"
              aria-label="이전 달"
            >
              ←
            </button>
            <h2 className="text-lg font-semibold text-card-foreground">{month}</h2>
            <button
              onClick={() => changeMonth(1)}
              className="rounded border p-2 text-sm hover:bg-muted"
              aria-label="다음 달"
            >
              →
            </button>
          </div>

          {isListLoading ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : diaries.length === 0 ? (
            <p className="text-muted-foreground">이번 달 일기가 없습니다.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {diaries.map((item) => {
                const moodOption = getMood(item.mood as Mood)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(item.date)}
                      className="flex w-full items-center gap-3 rounded border bg-background p-3 text-left hover:bg-muted"
                    >
                      <span
                        className={cn(
                          'rounded px-2 py-1 text-xs font-medium',
                          moodOption.color,
                        )}
                      >
                        {moodOption.label}
                      </span>
                      <span className="text-sm text-foreground">{item.date}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
