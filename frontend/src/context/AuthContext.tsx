import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, refreshSession, setAccessToken, subscribeSession } from '../lib/api'
import type { SessionPayload, User } from '../lib/types'

type AuthStatus = 'checking' | 'authenticated' | 'anonymous'

interface RegisterInput {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  password: string
}

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  login: (identifier: string, password: string) => Promise<User>
  register: (data: RegisterInput) => Promise<User>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<User>
  reloadUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('checking')

  const applySession = useCallback((session: SessionPayload | null) => {
    setAccessToken(session?.access ?? null)
    setUser(session?.user ?? null)
    setStatus(session ? 'authenticated' : 'anonymous')
  }, [])

  // Au chargement : restaure la session depuis le cookie HttpOnly (s'il existe).
  useEffect(() => {
    subscribeSession(applySession)
    void refreshSession()
    return () => subscribeSession(null)
  }, [applySession])

  // Rafraîchit l'access token un peu avant son expiration pour éviter les 401 visibles.
  useEffect(() => {
    if (status !== 'authenticated') return
    const id = window.setInterval(() => void refreshSession(), 12 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [status])

  const login = useCallback(
    async (identifier: string, password: string) => {
      const session = await api.post<SessionPayload>('/auth/login/', { identifier, password }, { skipRefresh: true })
      applySession(session)
      return session.user
    },
    [applySession],
  )

  const register = useCallback(
    async (data: RegisterInput) => {
      const session = await api.post<SessionPayload>('/auth/register/', data, { skipRefresh: true })
      applySession(session)
      return session.user
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout/', undefined, { skipRefresh: true })
    } finally {
      applySession(null)
    }
  }, [applySession])

  const updateProfile = useCallback(async (data: Partial<User>) => {
    const updated = await api.patch<User>('/auth/me/', data)
    setUser(updated)
    return updated
  }, [])

  const reloadUser = useCallback(async () => {
    setUser(await api.get<User>('/auth/me/'))
  }, [])

  const value = useMemo(
    () => ({ user, status, login, register, logout, updateProfile, reloadUser }),
    [user, status, login, register, logout, updateProfile, reloadUser],
  )
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return context
}
