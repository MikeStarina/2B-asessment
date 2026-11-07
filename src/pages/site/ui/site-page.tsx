import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { getSite, updateSite } from '@/entities/site/index.ts'
import { createTask, listTasksBySite } from '@/entities/task/index.ts'
import { listProfiles, profileName, useCurrentProfile } from '@/entities/profile/index.ts'
import { listStages, stageTitle } from '@/entities/stage/index.ts'
import type { Profile, Site, Stage, Task } from '@/shared/api/index.ts'
import { routes } from '@/shared/config/index.ts'
import { errorText, filled, parseId } from '@/shared/lib/index.ts'
import { Button, Field, Loading, Notice } from '@/shared/ui/index.ts'

type SiteCard = {
  site: Site | null
  tasks: Task[]
  stages: Stage[]
  profiles: Profile[]
}

function SiteFields({ site, onSaved }: { site: Site; onSaved: () => void }) {
  const [title, setTitle] = useState(site.title)
  const [address, setAddress] = useState(site.address)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canSave = filled(title) && filled(address)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave || pending) {
      return
    }
    setPending(true)
    setError(null)
    try {
      await updateSite(site.id, { title: title.trim(), address: address.trim() })
      onSaved()
    } catch (saveError: unknown) {
      setError(errorText(saveError))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)}>
      <Field id="site-title" label="Название">
        <input
          id="site-title"
          name="title"
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field id="site-address" label="Адрес">
        <input
          id="site-address"
          name="address"
          autoComplete="street-address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
      </Field>
      {error ? <Notice>{error}</Notice> : null}
      <Button type="submit" pending={pending} disabled={!canSave}>
        Сохранить
      </Button>
    </form>
  )
}

function NewTaskForm({
  siteId,
  profiles,
  onCreated,
}: {
  siteId: number
  profiles: Profile[]
  onCreated: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const executors = profiles.filter((profile) => profile.role === 'executor')
  const canSave = filled(title) && assigneeId !== ''

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSave || pending) {
      return
    }
    setPending(true)
    setError(null)
    try {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        siteId,
        assigneeId,
      })
      setTitle('')
      setDescription('')
      setAssigneeId('')
      onCreated()
    } catch (createError: unknown) {
      setError(errorText(createError))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)}>
      <h2>Новая задача</h2>
      <Field id="task-title" label="Название">
        <input
          id="task-title"
          name="title"
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field id="task-description" label="Описание">
        <textarea
          id="task-description"
          name="description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field id="task-assignee" label="Исполнитель">
        <select
          id="task-assignee"
          name="assignee"
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
        >
          <option value="">Выберите исполнителя</option>
          {executors.map((executor) => (
            <option key={executor.id} value={executor.id}>
              {executor.full_name}
            </option>
          ))}
        </select>
      </Field>
      {error ? <Notice>{error}</Notice> : null}
      <Button type="submit" pending={pending} disabled={!canSave}>
        Создать задачу
      </Button>
    </form>
  )
}

function MissingSite() {
  return (
    <p>
      Не найдено. <Link to={routes.sites}>К списку строек</Link>
    </p>
  )
}

export function SitePage() {
  const { siteId } = useParams()
  return <SiteCard key={siteId ?? ''} />
}

function SiteCard() {
  const params = useParams()
  const siteId = parseId(params.siteId)
  const { status: profileStatus, profile, error: profileError } = useCurrentProfile()
  const [card, setCard] = useState<SiteCard | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (siteId == null) {
      return
    }
    let active = true
    void Promise.all([getSite(siteId), listTasksBySite(siteId), listStages(), listProfiles()])
      .then(([site, tasks, stages, profiles]) => {
        if (active) {
          setCard({ site, tasks, stages, profiles })
          setLoadError(null)
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
  }, [siteId, reloadKey])

  if (siteId == null) {
    return <MissingSite />
  }
  if (profileStatus === 'loading' || (card === null && !loadError)) {
    return <Loading />
  }
  if (profileStatus === 'error' || !profile) {
    return <Notice>{profileError ?? 'Профиль не найден.'}</Notice>
  }
  if (loadError || !card) {
    return <Notice>{loadError}</Notice>
  }
  if (!card.site) {
    return <MissingSite />
  }

  const site = card.site
  const isManager = profile.role === 'manager'

  return (
    <>
      <h1>{site.title}</h1>
      {isManager ? (
        <SiteFields
          key={`${site.title}\0${site.address}`}
          site={site}
          onSaved={() => setReloadKey((value) => value + 1)}
        />
      ) : (
        <p>{site.address}</p>
      )}
      <h2>Задачи</h2>
      {card.tasks.length === 0 ? <p>На этой стройке задач нет</p> : null}
      <ul className="cards">
        {card.tasks.map((task) => (
          <li key={task.id}>
            <Link to={routes.task(task.id)}>{task.title}</Link>
            <p className="meta">
              <span>{profileName(card.profiles, task.assignee_id)}</span>
              <span>{stageTitle(card.stages, task.stage_id)}</span>
            </p>
          </li>
        ))}
      </ul>
      {isManager ? (
        <NewTaskForm
          siteId={site.id}
          profiles={card.profiles}
          onCreated={() => setReloadKey((value) => value + 1)}
        />
      ) : null}
    </>
  )
}
