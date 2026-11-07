import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { routes } from '@/shared/config/index.ts'
import { signIn } from '@/shared/auth/index.ts'
import { errorText, filled } from '@/shared/lib/index.ts'
import { Button, Field, Notice } from '@/shared/ui/index.ts'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canSubmit = filled(email) && filled(password)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit || pending) {
      return
    }
    setPending(true)
    setError(null)
    try {
      await signIn(email.trim(), password.trim())
      navigate(routes.home)
    } catch (signInError: unknown) {
      setError(errorText(signInError))
      setPending(false)
    }
  }

  return (
    <main>
      <h1>Вход</h1>
      <form onSubmit={(event) => void onSubmit(event)}>
        <Field id="email" label="Email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field id="current-password" label="Пароль">
          <input
            id="current-password"
            name="password"
            type="password"
            autoComplete="current-password"
            enterKeyHint="done"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {error ? <Notice>{error}</Notice> : null}
        <Button type="submit" pending={pending} disabled={!canSubmit}>
          Войти
        </Button>
      </form>
    </main>
  )
}
