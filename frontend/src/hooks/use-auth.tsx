import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  getCurrentUser,
  login as apiLogin,
  register as apiRegister,
  loginWithGoogle as apiLoginWithGoogle,
  updateProfile as apiUpdateProfile,
  logout as apiLogout,
  getAuthToken,
  removeAuthToken,
  type UserProfileResponse,
  type LoginRequest,
  type RegisterRequest,
  type UpdateProfileRequest,
} from '@/lib/api'

interface AuthContextType {
  user: UserProfileResponse | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (req: LoginRequest) => Promise<void>
  register: (req: RegisterRequest) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  updateProfile: (data: UpdateProfileRequest) => Promise<UserProfileResponse>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfileResponse | null>(null)
  const [token, setToken] = useState<string | null>(getAuthToken())
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshUser = useCallback(async () => {
    const activeToken = getAuthToken()
    if (!activeToken) {
      setUser(null)
      setToken(null)
      setIsLoading(false)
      return
    }

    try {
      const profile = await getCurrentUser()
      setUser(profile)
      setToken(activeToken)
    } catch {
      removeAuthToken()
      setUser(null)
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()

    const handleUnauthorized = () => {
      removeAuthToken()
      setUser(null)
      setToken(null)
    }

    window.addEventListener('trace_auth_unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('trace_auth_unauthorized', handleUnauthorized)
    }
  }, [refreshUser])

  const login = async (req: LoginRequest) => {
    setIsLoading(true)
    try {
      const res = await apiLogin(req)
      setUser(res.user)
      setToken(res.access_token)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (req: RegisterRequest) => {
    setIsLoading(true)
    try {
      const res = await apiRegister(req)
      setUser(res.user)
      setToken(res.access_token)
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithGoogle = async (credential: string) => {
    setIsLoading(true)
    try {
      const res = await apiLoginWithGoogle(credential)
      setUser(res.user)
      setToken(res.access_token)
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (data: UpdateProfileRequest): Promise<UserProfileResponse> => {
    const updated = await apiUpdateProfile(data)
    setUser(updated)
    return updated
  }

  const logout = async () => {
    try {
      await apiLogout()
    } finally {
      removeAuthToken()
      setUser(null)
      setToken(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        loginWithGoogle,
        updateProfile,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
