import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useRegister } from '@/api/auth'
import { registerSchema, type RegisterInput } from '@/types/schemas'

export default function Register() {
  const navigate = useNavigate()
  const { mutate: register, isPending, error } = useRegister()
  const [form, setForm] = useState<RegisterInput>({ email: '', password: '', name: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({})

  const handleChange = (field: keyof RegisterInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = registerSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof RegisterInput, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof RegisterInput
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    register(parsed.data, {
      onSuccess: () => navigate('/'),
    })
  }

  const getErrorMessage = () => {
    if (!error) return null
    if (isAxiosError(error) && error.response?.status === 409) {
      return '이미 가입된 이메일입니다.'
    }
    return '회원가입 중 오류가 발생했습니다.'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-card-foreground">회원가입</h1>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-card-foreground">이름</label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
          />
          {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-card-foreground">이메일</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
          />
          {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-card-foreground">비밀번호</label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-foreground"
          />
          {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password}</p>}
        </div>
        {getErrorMessage() && <p className="text-sm text-destructive">{getErrorMessage()}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? '가입 중...' : '회원가입'}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요? <Link to="/login" className="text-primary underline">로그인</Link>
        </p>
      </form>
    </div>
  )
}
