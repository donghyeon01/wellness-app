import { useState } from 'react'
import { isAxiosError } from 'axios'
import { useTodos, useCreateTodo, useUpdateTodo, useDeleteTodo } from '@/api/todos'
import { todoInputSchema, todoUpdateSchema, type Todo, type TodoInput, type TodoUpdateInput, type TodoFilters } from '@/types/schemas'

const PRIORITY_LABELS: Record<number, string> = {
  0: '낮음',
  1: '보통',
  2: '높음',
}

const EMPTY_FORM: TodoInput = {
  title: '',
  description: null,
  priority: 0,
  dueDate: null,
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ko-KR')
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function Todos() {
  const [filters, setFilters] = useState<TodoFilters>({ completed: 'all', priority: 'all' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TodoInput>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof TodoInput | 'submit', string>>>({})

  const { data: todos, isLoading, error: listError } = useTodos(filters)
  const create = useCreateTodo()
  const update = useUpdateTodo()
  const remove = useDeleteTodo()

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setErrors({})
  }

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setForm({
      title: todo.title,
      description: todo.description ?? null,
      priority: todo.priority,
      dueDate: toDateInputValue(todo.dueDate) || null,
    })
    setErrors({})
  }

  const handleChange = <K extends keyof TodoInput>(field: K, value: TodoInput[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const dueDate = form.dueDate?.trim() ? new Date(form.dueDate).toISOString() : null
    const payload = { ...form, description: form.description?.trim() || null, dueDate }
    const schema = editingId ? todoUpdateSchema : todoInputSchema
    const parsed = schema.safeParse(payload)

    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof TodoInput | 'submit', string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof TodoInput | 'submit'
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})

    if (editingId) {
      update.mutate(
        { id: editingId, input: parsed.data as TodoUpdateInput },
        { onSuccess: resetForm },
      )
    } else {
      create.mutate(parsed.data as TodoInput, { onSuccess: resetForm })
    }
  }

  const handleToggle = (todo: Todo) => {
    update.mutate({ id: todo.id, input: { completed: !todo.completed } })
  }

  const handleDelete = (id: string) => {
    remove.mutate(id)
  }

  const getErrorMessage = () => {
    if (!listError) return null
    if (isAxiosError(listError) && listError.response?.status === 401) {
      return '인증이 필요합니다.'
    }
    return 'TODO 목록을 불러오는 중 오류가 발생했습니다.'
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-foreground">할 일</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-card-foreground">
            {editingId ? 'TODO 수정' : '새 TODO'}
          </h2>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-card-foreground">
              제목
            </label>
            <input
              id="title"
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
            />
            {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-card-foreground">
              설명
            </label>
            <textarea
              id="description"
              rows={3}
              value={form.description ?? ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
            />
            {errors.description && <p className="mt-1 text-sm text-destructive">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-card-foreground">
                중요도
              </label>
              <select
                id="priority"
                value={form.priority}
                onChange={(e) => handleChange('priority', Number(e.target.value))}
                className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
              >
                <option value={0}>낮음</option>
                <option value={1}>보통</option>
                <option value={2}>높음</option>
              </select>
              {errors.priority && <p className="mt-1 text-sm text-destructive">{errors.priority}</p>}
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-card-foreground">
                마감일
              </label>
              <input
                id="dueDate"
                type="date"
                value={form.dueDate ?? ''}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
              />
              {errors.dueDate && <p className="mt-1 text-sm text-destructive">{errors.dueDate}</p>}
            </div>
          </div>

          {errors.submit && <p className="text-sm text-destructive">{errors.submit}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={create.isPending || update.isPending}
              className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {editingId ? (update.isPending ? '수정 중...' : '수정') : create.isPending ? '생성 중...' : '생성'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded border border-input bg-background px-4 py-2 text-foreground hover:bg-muted"
              >
                취소
              </button>
            )}
          </div>
        </form>

        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <label htmlFor="filter-completed" className="text-sm font-medium text-card-foreground">
              완료
            </label>
            <select
              id="filter-completed"
              value={filters.completed}
              onChange={(e) => setFilters((prev) => ({ ...prev, completed: e.target.value as TodoFilters['completed'] }))}
              className="rounded border border-input bg-background px-3 py-2 text-foreground"
            >
              <option value="all">전체</option>
              <option value="active">미완료</option>
              <option value="completed">완료</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="filter-priority" className="text-sm font-medium text-card-foreground">
              우선순위
            </label>
            <select
              id="filter-priority"
              value={filters.priority}
              onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value as TodoFilters['priority'] }))}
              className="rounded border border-input bg-background px-3 py-2 text-foreground"
            >
              <option value="all">전체</option>
              <option value="0">낮음</option>
              <option value="1">보통</option>
              <option value="2">높음</option>
            </select>
          </div>
        </div>

        {getErrorMessage() && <p className="text-sm text-destructive">{getErrorMessage()}</p>}

        {isLoading && <p className="text-center text-muted-foreground">불러오는 중...</p>}

        <ul className="space-y-3">
          {todos?.map((todo) => (
            <li
              key={todo.id}
              className={`flex items-start justify-between rounded-lg border bg-card p-4 shadow-sm ${
                todo.completed ? 'opacity-70' : ''
              }`}
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => handleToggle(todo)}
                    aria-label={todo.completed ? '미완료로 변경' : '완료로 변경'}
                    className="h-4 w-4"
                  />
                  <span className={`font-medium text-card-foreground ${todo.completed ? 'line-through' : ''}`}>
                    {todo.title}
                  </span>
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {PRIORITY_LABELS[todo.priority]}
                  </span>
                </div>
                {todo.description && (
                  <p className="pl-6 text-sm text-muted-foreground">{todo.description}</p>
                )}
                {todo.dueDate && (
                  <p className="pl-6 text-xs text-muted-foreground">마감일: {formatDate(todo.dueDate)}</p>
                )}
              </div>

              <div className="ml-4 flex gap-2">
                <button
                  onClick={() => startEdit(todo)}
                  className="rounded border border-input bg-background px-3 py-1 text-sm text-foreground hover:bg-muted"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(todo.id)}
                  disabled={remove.isPending}
                  className="rounded bg-destructive px-3 py-1 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>

        {!isLoading && todos?.length === 0 && (
          <p className="text-center text-muted-foreground">할 일이 없습니다.</p>
        )}
      </div>
    </div>
  )
}
