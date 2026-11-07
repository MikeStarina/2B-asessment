import { createContext, useContext } from 'react'
import { getSupabase } from '@/shared/api/client.ts'

export type SessionState = {
  status: 'loading' | 'ready'
  userId: string | null
}

export const SessionContext = createContext<SessionState | null>(null)

export function useSession(): SessionState {
  const value = useContext(SessionContext)
  if (!value) {
    throw new Error('Сессия вне провайдера')
  }
  return value
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password })
  if (error) {
    throw error
  }
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut()
  if (error) {
    throw error
  }
}
