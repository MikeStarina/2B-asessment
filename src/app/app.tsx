import { RouterProvider } from 'react-router'
import { CurrentProfileProvider } from '@/entities/profile/index.ts'
import { hasSupabaseEnv } from '@/shared/api/index.ts'
import { SessionProvider } from '@/shared/auth/index.ts'
import { router } from './router.tsx'
import './styles/app.css'

export function App() {
  if (!hasSupabaseEnv) {
    return (
      <p className="missing-env" role="alert">
        В .env.local нужны VITE_SUPABASE_URL и VITE_SUPABASE_PUBLISHABLE_KEY.
      </p>
    )
  }

  return (
    <SessionProvider>
      <CurrentProfileProvider>
        <RouterProvider router={router} />
      </CurrentProfileProvider>
    </SessionProvider>
  )
}
