export const routes = {
  home: '/',
  login: '/login',
  sites: '/sites',
  myTasks: '/my-tasks',
  site: (id: number) => `/sites/${id}`,
  task: (id: number) => `/tasks/${id}`,
} as const
