import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { createSite, listSites } from '@/entities/site/index.ts'
import { useCurrentProfile } from '@/entities/profile/index.ts'
import type { Site } from '@/shared/api/index.ts'
import { routes } from '@/shared/config/index.ts'
import { errorText, filled } from '@/shared/lib/index.ts'
import { Button, Field, Loading, Notice } from '@/shared/ui/index.ts'

export function SitesPage() {
  const navigate = useNavigate()
  const { status: profileStatus, profile, error: profileError } = useCurrentProfile()
  const [sites, setSites] = useState<Site[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void listSites()
      .then((rows) => {
        if (active) {
          setSites(rows)
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(errorText(error))
        }
      })
    return () => {
      active = false
    }
  }, [])

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!filled(title) || !filled(address) || pending) {
      return
    }
    setPending(true)
    setFormError(null)
    try {
      const id = await createSite({ title: title.trim(), address: address.trim() })
      navigate(routes.site(id))
    } catch (error: unknown) {
      setFormError(errorText(error))
      setPending(false)
    }
  }

  if (profileStatus === 'loading' || (sites === null && !loadError)) {
    return <Loading />
  }
  if (profileStatus === 'error' || !profile) {
    return <Notice>{profileError ?? 'Профиль не найден.'}</Notice>
  }
  if (loadError || sites === null) {
    return <Notice>{loadError}</Notice>
  }

  return (
    <>
      <h1>Стройки</h1>
      {sites.length === 0 ? <p>Строек пока нет</p> : null}
      <ul className="cards">
        {sites.map((site) => (
          <li key={site.id}>
            <Link to={routes.site(site.id)}>{site.title}</Link>
            <p className="meta">{site.address}</p>
          </li>
        ))}
      </ul>
      {profile.role === 'manager' ? (
        <form onSubmit={(event) => void onCreate(event)}>
          <h2>Новая стройка</h2>
          <Field id="new-site-title" label="Название">
            <input
              id="new-site-title"
              name="title"
              value={title}
              autoComplete="off"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field id="new-site-address" label="Адрес">
            <input
              id="new-site-address"
              name="address"
              autoComplete="street-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </Field>
          {formError ? <Notice>{formError}</Notice> : null}
          <Button type="submit" pending={pending} disabled={!filled(title) || !filled(address)}>
            Создать
          </Button>
        </form>
      ) : null}
    </>
  )
}
