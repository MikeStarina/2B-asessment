import { createBrowserRouter, Navigate } from 'react-router'
import { LoginPage } from '@/pages/login/index.ts'
import { MyTasksPage } from '@/pages/my-tasks/index.ts'
import { SitePage } from '@/pages/site/index.ts'
import { SitesPage } from '@/pages/sites/index.ts'
import { TaskPage } from '@/pages/task/index.ts'
import { routes } from '@/shared/config/index.ts'
import { AppLayout, GuestOnly, RequireSession, RoleHome } from './guards.tsx'

export const router = createBrowserRouter([
  {
    path: routes.login,
    element: <GuestOnly />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    element: <RequireSession />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <RoleHome /> },
          { path: 'sites', element: <SitesPage /> },
          { path: 'sites/:siteId', element: <SitePage /> },
          { path: 'tasks/:taskId', element: <TaskPage /> },
          { path: 'my-tasks', element: <MyTasksPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={routes.home} replace /> },
])
