import { useNavigate } from 'react-router-dom'
import { useMe, useLogout } from '@/api/auth'
import { useAuth } from '@/stores/auth'

export default function Profile() {
  const { data, isLoading } = useMe()
  const { mutate: logout, isPending } = useLogout()
  const navigate = useNavigate()
  const storeUser = useAuth((state) => state.user)

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => navigate('/login'),
    })
  }

  if (isLoading) {
    return <p className="p-8 text-center text-muted-foreground">불러오는 중...</p>
  }

  const user = storeUser ?? data
  if (!user) {
    return <p className="p-8 text-center text-muted-foreground">사용자 정보를 불러올 수 없습니다.</p>
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-card-foreground">내 정보</h1>
        <p className="mt-2 text-muted-foreground">이름: {user.name}</p>
        <p className="text-muted-foreground">이메일: {user.email}</p>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="mt-6 rounded bg-destructive px-4 py-2 text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
        >
          {isPending ? '로그아웃 중...' : '로그아웃'}
        </button>
      </div>
    </div>
  )
}
