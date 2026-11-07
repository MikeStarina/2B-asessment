import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { listSites } from '@/entities/site/index.ts'
import { listTasksByAssignee } from '@/entities/task/index.ts'
import { useCurrentProfile } from '@/entities/profile/index.ts'
import { listStages, stageTitle } from '@/entities/stage/index.ts'
import type { Site, Stage, Task } from '@/shared/api/index.ts'
import { routes } from '@/shared/config/index.ts'
import { errorText } from '@/shared/lib/index.ts'
import { useSession } from '@/shared/auth/index.ts'
import { Loading, Notice } from '@/shared/ui/index.ts'

type MyTasksData = {
  tasks: Task[]
  sites: Site[]
  stages: Stage[]
}

export function MyTasksPage() {
  const { userId } = useSession()
  const { status, profile, error: profileError } = useCurrentProfile()
  const [data, setData] = useState<MyTasksData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId || profile?.role !== 'executor') {
      return
    }
    let active = true
    void Promise.all([listTasksByAssignee(userId), listSites(), listStages()])
      .then(([tasks, sites, stages]) => {
        if (active) {
          setData({ tasks, sites, stages })
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
  }, [userId, profile?.role])

  if (status === 'loading') {
    return <Loading />
  }
  if (!profile) {
    return <Notice>{profileError ?? 'Профиль не найден.'}</Notice>
  }
  if (profile.role === 'manager') {
    return <Navigate to={routes.sites} replace />
  }
  if (loadError) {
    return <Notice>{loadError}</Notice>
  }
  if (!data) {
    return <Loading />
  }

  return (
    <>
      <h1>Мои задачи</h1>
      {data.tasks.length === 0 ? <p>Задач пока нет</p> : null}
      <ul className="cards">
        {data.tasks.map((task) => (
          <li key={task.id}>
            <Link to={routes.task(task.id)}>{task.title}</Link>
            <p className="meta">
              <span>{data.sites.find((site) => site.id === task.site_id)?.title ?? '—'}</span>
              <span>{stageTitle(data.stages, task.stage_id)}</span>
            </p>
          </li>
        ))}
      </ul>
    </>
  )
}
