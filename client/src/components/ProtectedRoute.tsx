import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/auth'
import { useMe } from '@/api/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const user = useAuth((state) => state.user)
  const { isLoading, isError } = useMe()
  const location = useLocation()

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">불러오는 중...</div>
  }

  if (!user || isError) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
