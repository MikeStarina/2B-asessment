import { useEffect, useState, type ReactNode } from 'react'
import type { Profile } from '@/shared/api/index.ts'
import { useSession } from '@/shared/auth/index.ts'
import { errorText } from '@/shared/lib/index.ts'
import { getProfile } from '../api/profile.ts'
import { CurrentProfileContext, type CurrentProfileState } from './current-profile-state.ts'

type LoadedProfile = {
  userId: string
  profile: Profile | null
  error: string | null
}

function viewOf(
  sessionStatus: 'loading' | 'ready',
  userId: string | null,
  loaded: LoadedProfile | null,
): CurrentProfileState {
  if (sessionStatus === 'loading') {
    return { status: 'loading', profile: null, error: null }
  }
  if (!userId) {
    return { status: 'ready', profile: null, error: null }
  }
  if (!loaded || loaded.userId !== userId) {
    return { status: 'loading', profile: null, error: null }
  }
  if (loaded.error) {
    return { status: 'error', profile: null, error: loaded.error }
  }
  return { status: 'ready', profile: loaded.profile, error: null }
}

export function CurrentProfileProvider({ children }: { children: ReactNode }) {
  const { status, userId } = useSession()
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null)

  useEffect(() => {
    if (status === 'loading' || !userId) {
      return
    }
    let active = true
    void getProfile(userId)
      .then((profile) => {
        if (active) {
          setLoaded({ userId, profile, error: null })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoaded({ userId, profile: null, error: errorText(error) })
        }
      })
    return () => {
      active = false
    }
  }, [status, userId])

  return (
    <CurrentProfileContext.Provider value={viewOf(status, userId, loaded)}>
      {children}
    </CurrentProfileContext.Provider>
  )
}
