import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { useLogin } from '@/api/auth'
import { loginSchema, type LoginInput } from '@/types/schemas'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  const { mutate: login, isPending, error } = useLogin()
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({})

  const handleChange = (field: keyof LoginInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = loginSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof LoginInput, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof LoginInput
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }
    setErrors({})
    login(parsed.data, {
      onSuccess: () => navigate(from, { replace: true }),
    })
  }

  const getErrorMessage = () => {
    if (!error) return null
    if (isAxiosError(error) && error.response?.status === 401) {
      return '이메일 또는 비밀번호가 올바르지 않습니다.'
    }
    return '로그인 중 오류가 발생했습니다.'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-card-foreground">로그인</h1>
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
          {isPending ? '로그인 중...' : '로그인'}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          계정이 없으신가요? <Link to="/register" className="text-primary underline">회원가입</Link>
        </p>
      </form>
    </div>
  )
}
