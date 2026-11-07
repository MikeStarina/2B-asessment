import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { listSites } from '@/entities/site/index.ts'
import { listProfiles, profileName, useCurrentProfile } from '@/entities/profile/index.ts'
import { listStages, stageByCode, stageTitle } from '@/entities/stage/index.ts'
import { availableExits, getTask, transitionTask, updateTask } from '@/entities/task/index.ts'
import type { HistoryEntry, Profile, Site, Stage, StageExit, Task } from '@/shared/api/index.ts'
import { useSession } from '@/shared/auth/index.ts'
import { routes } from '@/shared/config/index.ts'
import { errorText, filled, formatWhen, parseId } from '@/shared/lib/index.ts'
import { Button, Field, Loading, Notice } from '@/shared/ui/index.ts'
import { listTaskHistory } from '../api/task-history.ts'

type TaskCard = {
  task: Task | null
  history: HistoryEntry[]
  stages: Stage[]
  profiles: Profile[]
  sites: Site[]
}

function MissingTask({ role }: { role: Profile['role'] }) {
  const to = role === 'executor' ? routes.myTasks : routes.sites
  const label = role === 'executor' ? 'К моим задачам' : 'К списку строек'
  return (
    <p>
      Не найдено. <Link to={to}>{label}</Link>
    </p>
  )
}

function TaskFacts({
  task,
  stages,
  profiles,
}: {
  task: Task
  stages: Stage[]
  profiles: Profile[]
}) {
  return (
    <dl>
      <div>
        <dt>Исполнитель</dt>
        <dd>{profileName(profiles, task.assignee_id)}</dd>
      </div>
      <div>
        <dt>Автор</dt>
        <dd>{profileName(profiles, task.author_id)}</dd>
      </div>
      <div>
        <dt>Стадия</dt>
        <dd>{stageTitle(stages, task.stage_id)}</dd>
      </div>
      <div>
        <dt>Создана</dt>
        <dd>
          <time dateTime={task.created_at}>{formatWhen(task.created_at)}</time>
        </dd>
      </div>
    </dl>
  )
}

function TaskFields({
  task,
  sites,
  onSaved,
}: {
  task: Task
  sites: Site[]
  onSaved: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [siteId, setSiteId] = useState(String(task.site_id))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!filled(title) || pending) {
      return
    }
    setPending(true)
    setError(null)
    try {
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim(),
        siteId: Number(siteId),
      })
      onSaved()
    } catch (saveError: unknown) {
      setError(errorText(saveError))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)}>
      <Field id="edit-task-title" label="Название">
        <input
          id="edit-task-title"
          name="title"
          autoComplete="off"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field id="edit-task-description" label="Описание">
        <textarea
          id="edit-task-description"
          name="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field id="edit-task-site" label="Стройка">
        <select
          id="edit-task-site"
          name="site"
          value={siteId}
          onChange={(event) => setSiteId(event.target.value)}
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.title}
            </option>
          ))}
        </select>
      </Field>
      {error ? <Notice>{error}</Notice> : null}
      <Button type="submit" pending={pending} disabled={!filled(title)}>
        Сохранить
      </Button>
    </form>
  )
}

function TaskTransitions({
  task,
  stages,
  exits,
  onDone,
}: {
  task: Task
  stages: Stage[]
  exits: StageExit[]
  onDone: () => void
}) {
  const [comment, setComment] = useState('')
  const [pendingCode, setPendingCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const needsComment = exits.some((exit) => exit.comment_required)

  async function onTransition(exit: StageExit) {
    const target = stageByCode(stages, exit.to)
    if (!target || pendingCode !== null) {
      return
    }
    setPendingCode(exit.to)
    setError(null)
    try {
      await transitionTask({
        taskId: task.id,
        expectedStageId: task.stage_id,
        toStageId: target.id,
        comment: exit.comment_required ? comment.trim() : null,
      })
      setComment('')
      onDone()
    } catch (transitionError: unknown) {
      setError(errorText(transitionError))
    } finally {
      setPendingCode(null)
    }
  }

  if (exits.length === 0) {
    return null
  }

  return (
    <section>
      <h2>Действия</h2>
      {needsComment ? (
        <Field id="task-comment" label="Комментарий">
          <textarea
            id="task-comment"
            name="comment"
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </Field>
      ) : null}
      <div className="actions">
        {exits.map((exit) => {
          const target = stageByCode(stages, exit.to)
          if (!target) {
            return null
          }
          return (
            <Button
              key={exit.to}
              pending={pendingCode === exit.to}
              disabled={(exit.comment_required && !filled(comment)) || pendingCode !== null}
              onClick={() => void onTransition(exit)}
            >
              {target.title}
            </Button>
          )
        })}
      </div>
      {error ? <Notice>{error}</Notice> : null}
    </section>
  )
}

function historyLine(entry: HistoryEntry, stages: Stage[]): string {
  const arrived = stageTitle(stages, entry.to_stage_id)
  if (entry.from_stage_id == null) {
    return arrived
  }
  return `${stageTitle(stages, entry.from_stage_id)} → ${arrived}`
}

function TaskHistory({
  history,
  stages,
  profiles,
}: {
  history: HistoryEntry[]
  stages: Stage[]
  profiles: Profile[]
}) {
  return (
    <section>
      <h2>История</h2>
      <ol className="history">
        {history.map((entry) => (
          <li key={entry.id}>
            <p className="meta">
              <span>{profileName(profiles, entry.actor_id)}</span>
              <time dateTime={entry.created_at}>{formatWhen(entry.created_at)}</time>
            </p>
            <p>{historyLine(entry, stages)}</p>
            {entry.comment ? <p>{entry.comment}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  )
}

export function TaskPage() {
  const { taskId } = useParams()
  return <TaskCardView key={taskId ?? ''} />
}

function TaskCardView() {
  const params = useParams()
  const taskId = parseId(params.taskId)
  const { userId } = useSession()
  const { status: profileStatus, profile, error: profileError } = useCurrentProfile()
  const [card, setCard] = useState<TaskCard | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (taskId == null) {
      return
    }
    let active = true
    void Promise.all([
      getTask(taskId),
      listTaskHistory(taskId),
      listStages(),
      listProfiles(),
      listSites(),
    ])
      .then(([task, history, stages, profiles, sites]) => {
        if (active) {
          setCard({ task, history, stages, profiles, sites })
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
  }, [taskId, reloadKey])

  if (profileStatus === 'loading' || (taskId != null && card === null && !loadError)) {
    return <Loading />
  }
  if (profileStatus === 'error' || !profile) {
    return <Notice>{profileError ?? 'Профиль не найден.'}</Notice>
  }
  if (taskId == null) {
    return <MissingTask role={profile.role} />
  }
  if (loadError || !card) {
    return <Notice>{loadError}</Notice>
  }
  if (!card.task) {
    return <MissingTask role={profile.role} />
  }

  const task = card.task
  const stage = card.stages.find((item) => item.id === task.stage_id)
  const exits = userId ? availableExits(stage, userId, task) : []
  const site = card.sites.find((item) => item.id === task.site_id)
  const isManager = profile.role === 'manager'

  return (
    <>
      <h1>{task.title}</h1>
      {isManager ? (
        <TaskFields
          key={`${task.title}\0${task.description}\0${task.site_id}`}
          task={task}
          sites={card.sites}
          onSaved={() => setReloadKey((value) => value + 1)}
        />
      ) : (
        <>
          <p>{task.description}</p>
          <p>
            Стройка:{' '}
            {site ? <Link to={routes.site(site.id)}>{site.title}</Link> : '—'}
          </p>
        </>
      )}
      <TaskFacts task={task} stages={card.stages} profiles={card.profiles} />
      <TaskTransitions
        key={task.stage_id}
        task={task}
        stages={card.stages}
        exits={exits}
        onDone={() => setReloadKey((value) => value + 1)}
      />
      <TaskHistory history={card.history} stages={card.stages} profiles={card.profiles} />
    </>
  )
}
