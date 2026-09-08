import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/axios'
import { clearCsrfToken } from '@/lib/csrf'
import { useAuth } from '@/stores/auth'
import type { LoginInput, RegisterInput, User } from '@/types/schemas'

export function useLogin() {
  const { setUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post<{ user: User }>('/auth/login', input)
      return data.user
    },
    onSuccess: (user) => {
      setUser(user)
      // 서버가 인증 상태 전환 시 CSRF 토큰을 재발급하므로 캐시를 비워 다음 mutation이 새 토큰을 받도록 한다.
      clearCsrfToken()
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useRegister() {
  const { setUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await api.post<{ user: User }>('/auth/register', input)
      return data.user
    },
    onSuccess: (user) => {
      setUser(user)
      clearCsrfToken()
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useLogout() {
  const { clearUser } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ ok: boolean }>('/auth/logout')
      return data.ok
    },
    onSuccess: () => {
      clearUser()
      clearCsrfToken()
      queryClient.removeQueries({ queryKey: ['me'] })
    },
  })
}

export function useMe() {
  const { setUser } = useAuth()

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<{ user: User | null }>('/auth/me')
      setUser(data.user)
      return data.user
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
