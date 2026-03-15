import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { hashSenha } from '../lib/hash'

export type Usuario = {
  id: string
  email: string
  nome: string | null
  tipo_usuario: string | null
}

const STORAGE_KEY = 'jsxsistema_user'

type AuthContextType = {
  user: Usuario | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function loadUserFromStorage(): Usuario | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Record<string, unknown>
    if (!data?.id || !data?.email) return null
    return {
      id: data.id as string,
      email: data.email as string,
      nome: (data.nome as string) ?? null,
      tipo_usuario: (data.tipo_usuario as string) ?? null,
    }
  } catch {
    // ignore
  }
  return null
}

function saveUserToStorage(user: Usuario | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(loadUserFromStorage())
    setLoading(false)
  }, [])

  async function signIn(email: string, password: string) {
    const emailTrim = email.trim().toLowerCase()
    const senhaHash = await hashSenha(password)

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, senha_hash, tipo_usuario')
      .eq('email', emailTrim)
      .maybeSingle()

    if (error) {
      return { error }
    }

    if (!data || (data.senha_hash ?? '').toLowerCase() !== senhaHash.toLowerCase()) {
      return { error: new Error('E-mail ou senha incorretos.') }
    }

    const usuario: Usuario = {
      id: data.id,
      email: data.email,
      nome: data.nome ?? null,
      tipo_usuario: data.tipo_usuario ?? null,
    }
    setUser(usuario)
    saveUserToStorage(usuario)
    return { error: null }
  }

  async function signOut() {
    setUser(null)
    saveUserToStorage(null)
  }

  const value: AuthContextType = { user, loading, signIn, signOut }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
