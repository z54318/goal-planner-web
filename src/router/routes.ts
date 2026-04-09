export const routes = {
  dashboard: '/',
  goals: '/goals',
  menus: '/menus',
  plans: '/plans',
  tasks: '/tasks',
  settings: '/settings',
  login: '/login',
  register: '/register',
} as const

export type AppRoutePath = (typeof routes)[keyof typeof routes]
