import { useEffect, useState, type ReactNode } from 'react'
import { getSupabase } from '@/shared/api/client.ts'
import { SessionContext, type SessionState } from './session-state.ts'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading', userId: null })

  useEffect(() => {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setState({ status: 'ready', userId: session?.user.id ?? null })
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
}
