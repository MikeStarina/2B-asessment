import { createContext, useContext } from 'react'
import type { Profile } from '@/shared/api/index.ts'

export type CurrentProfileState = {
  status: 'loading' | 'ready' | 'error'
  profile: Profile | null
  error: string | null
}

export const CurrentProfileContext = createContext<CurrentProfileState | null>(null)

export function useCurrentProfile(): CurrentProfileState {
  const value = useContext(CurrentProfileContext)
  if (!value) {
    throw new Error('Профиль вне провайдера')
  }
  return value
}
