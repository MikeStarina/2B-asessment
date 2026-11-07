import { useState } from 'react'
import { useNavigate, NavLink } from 'react-router'
import { roleLabel, useCurrentProfile } from '@/entities/profile/index.ts'
import { routes } from '@/shared/config/index.ts'
import { signOut } from '@/shared/auth/index.ts'
import { errorText } from '@/shared/lib/index.ts'
import { Button, Notice } from '@/shared/ui/index.ts'

export function Header() {
  const navigate = useNavigate()
  const { status, profile, error } = useCurrentProfile()
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (status === 'loading') {
    return (
      <header>
        <p role="status">Загрузка…</p>
      </header>
    )
  }

  if (!profile) {
    return (
      <header>
        <p>{error ?? 'Профиль не найден.'}</p>
      </header>
    )
  }

  async function onSignOut() {
    setPending(true)
    setSignOutError(null)
    try {
      await signOut()
      navigate(routes.login)
    } catch (signOutFailure: unknown) {
      setSignOutError(errorText(signOutFailure))
      setPending(false)
    }
  }

  return (
    <header>
      <p>
        {profile.full_name}, {roleLabel(profile.role)}
      </p>
      <nav>
        <NavLink to={routes.sites}>Стройки</NavLink>
        {profile.role === 'executor' ? <NavLink to={routes.myTasks}>Мои задачи</NavLink> : null}
        <Button pending={pending} onClick={() => void onSignOut()}>
          Выйти
        </Button>
      </nav>
      {signOutError ? <Notice>{signOutError}</Notice> : null}
    </header>
  )
}
