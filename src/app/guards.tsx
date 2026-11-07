import { Navigate, Outlet } from 'react-router'
import { useCurrentProfile } from '@/entities/profile/index.ts'
import { routes } from '@/shared/config/index.ts'
import { useSession } from '@/shared/auth/index.ts'
import { Header } from './header.tsx'
import { Loading } from '@/shared/ui/index.ts'

function GuestOnly() {
  const { status, userId } = useSession()
  if (status === 'loading') {
    return <Loading />
  }
  if (userId) {
    return <Navigate to={routes.home} replace />
  }
  return <Outlet />
}

function RequireSession() {
  const { status, userId } = useSession()
  if (status === 'loading') {
    return <Loading />
  }
  if (!userId) {
    return <Navigate to={routes.login} replace />
  }
  return <Outlet />
}

function RoleHome() {
  const { status, profile, error } = useCurrentProfile()
  if (status === 'loading') {
    return <Loading />
  }
  if (!profile) {
    return <p role="alert">{error ?? 'Профиль не найден.'}</p>
  }
  return <Navigate to={profile.role === 'manager' ? routes.sites : routes.myTasks} replace />
}

function AppLayout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
    </>
  )
}

export { AppLayout, GuestOnly, RequireSession, RoleHome }
