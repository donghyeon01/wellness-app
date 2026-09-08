import { useMemo, useState } from 'react'
import MDEditor from '@uiw/react-md-editor'
import {
  useMemos,
  useMemo as useMemoDetail,
  useCreateMemo,
  useUpdateMemo,
  useDeleteMemo,
} from '@/api/memos'
import { memoInputSchema, type Memo, type MemoInput } from '@/types/schemas'

type EditorMode = 'create' | 'edit' | null

export default function Memos() {
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<EditorMode>(null)
  const [form, setForm] = useState({ title: '', content: '', category: '' })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof MemoInput, string>>>({})

  // 카테고리 옵션은 필터와 무관하게 전체 목록에서 추출한다.
  const { data: allMemos } = useMemos()
  const { data: memos, isLoading } = useMemos(categoryFilter || undefined)
  const { data: selected } = useMemoDetail(editorMode ? undefined : (selectedId ?? undefined))
  const createMemo = useCreateMemo()
  const updateMemo = useUpdateMemo()
  const deleteMemo = useDeleteMemo()

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          (allMemos ?? [])
            .map((memo) => memo.category)
            .filter((category): category is string => Boolean(category)),
        ),
      ).sort(),
    [allMemos],
  )

  const startCreate = () => {
    setForm({ title: '', content: '', category: '' })
    setFormErrors({})
    setEditorMode('create')
    setSelectedId(null)
  }

  const startEdit = (memo: Memo) => {
    setForm({ title: memo.title, content: memo.content, category: memo.category ?? '' })
    setFormErrors({})
    setEditorMode('edit')
    setSelectedId(memo.id)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const input: MemoInput = {
      title: form.title,
      content: form.content,
      category: form.category.trim() ? form.category.trim() : undefined,
    }
    const parsed = memoInputSchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof MemoInput, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof MemoInput
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message
        }
      }
      setFormErrors(fieldErrors)
      return
    }
    setFormErrors({})
    if (editorMode === 'create') {
      createMemo.mutate(parsed.data, {
        onSuccess: (memo) => {
          setEditorMode(null)
          setSelectedId(memo.id)
        },
      })
    } else if (editorMode === 'edit' && selectedId) {
      updateMemo.mutate({ id: selectedId, ...parsed.data }, { onSuccess: () => setEditorMode(null) })
    }
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('이 메모를 삭제할까요?')) return
    deleteMemo.mutate(id, {
      onSuccess: () => {
        if (selectedId === id) setSelectedId(null)
        if (editorMode === 'edit') setEditorMode(null)
      },
    })
  }

  const isSaving = createMemo.isPending || updateMemo.isPending

  return (
    <div className="min-h-screen bg-background p-8" data-color-mode="light">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">메모</h1>
          <button
            onClick={startCreate}
            className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            새 메모
          </button>
        </div>

        <div className="mt-4">
          <label htmlFor="category-filter" className="mr-2 text-sm font-medium text-foreground">
            카테고리
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded border border-input bg-background px-3 py-2 text-foreground"
          >
            <option value="">전체</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[280px_1fr]">
          <section aria-label="메모 목록">
            {isLoading ? (
              <p className="text-muted-foreground">불러오는 중...</p>
            ) : !memos || memos.length === 0 ? (
              <p className="text-muted-foreground">메모가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {memos.map((memo) => (
                  <li key={memo.id}>
                    <button
                      onClick={() => {
                        setSelectedId(memo.id)
                        setEditorMode(null)
                      }}
                      className={`w-full rounded border px-3 py-2 text-left ${
                        selectedId === memo.id
                          ? 'border-primary bg-accent'
                          : 'border-border bg-card hover:bg-accent'
                      }`}
                    >
                      <span className="block truncate font-medium text-card-foreground">
                        {memo.title}
                      </span>
                      {memo.category && (
                        <span className="mt-1 inline-block rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          {memo.category}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="메모 내용">
            {editorMode ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="memo-title" className="block text-sm font-medium text-foreground">
                    제목
                  </label>
                  <input
                    id="memo-title"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
                  />
                  {formErrors.title && (
                    <p className="mt-1 text-sm text-destructive">{formErrors.title}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="memo-category"
                    className="block text-sm font-medium text-foreground"
                  >
                    카테고리
                  </label>
                  <input
                    id="memo-category"
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
                  />
                  {formErrors.category && (
                    <p className="mt-1 text-sm text-destructive">{formErrors.category}</p>
                  )}
                </div>
                <div>
                  {formErrors.content && (
                    <p className="mb-1 text-sm text-destructive">{formErrors.content}</p>
                  )}
                  <MDEditor
                    value={form.content}
                    onChange={(value) => setForm((prev) => ({ ...prev, content: value ?? '' }))}
                    preview="live"
                    height={400}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode(null)}
                    className="rounded bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/90"
                  >
                    취소
                  </button>
                </div>
              </form>
            ) : selected ? (
              <article className="rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-card-foreground">{selected.title}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(selected)}
                      className="rounded bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-secondary/90"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(selected.id)}
                      disabled={deleteMemo.isPending}
                      className="rounded bg-destructive px-3 py-1.5 text-sm text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {selected.category && (
                  <span className="mt-2 inline-block rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {selected.category}
                  </span>
                )}
                <div className="mt-4">
                  <MDEditor.Markdown source={selected.content} />
                </div>
              </article>
            ) : (
              <p className="text-muted-foreground">메모를 선택하거나 새 메모를 작성하세요.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
