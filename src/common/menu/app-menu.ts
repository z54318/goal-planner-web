import { authApi } from '../api'
import type { AuthMenu } from '../api'

const APP_MENU_STORAGE_KEY = 'goal-planner-menus'
export const APP_MENU_UPDATED_EVENT = 'goal-planner-menus-updated'

export type AppMenuItem = {
  key: string
  label: string
  description?: string
  path: string
}

function normalizeMenuPath(path?: string) {
  if (!path) {
    return ''
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // 后端菜单里常把仪表盘配置成 /dashboard，前端首页实际挂在 /。
  if (normalizedPath === '/dashboard') {
    return '/'
  }

  return normalizedPath
}

function isMenuPathMatched(menuPath: string, currentPath: string) {
  if (menuPath === '/') {
    return currentPath === '/'
  }

  return currentPath === menuPath || currentPath.startsWith(`${menuPath}/`)
}

function sortMenus(menus: AuthMenu[]) {
  return [...menus].sort((left, right) => {
    return (left.sort_order ?? 0) - (right.sort_order ?? 0)
  })
}

function mapMenuNode(menu: AuthMenu): AppMenuItem[] {
  if (menu.hidden) {
    return []
  }

  const children = sortMenus(menu.children ?? []).flatMap(mapMenuNode)
  const path = normalizeMenuPath(menu.path)

  if (!menu.name || !path) {
    return children
  }

  return [
    {
      key: String(menu.id ?? path),
      label: menu.name,
      description: menu.component || menu.permission_code || undefined,
      path,
    },
    ...children,
  ]
}

// 将后端菜单树转换成侧边栏可直接使用的一维菜单结构。
export function mapAuthMenusToAppMenus(menus: AuthMenu[]) {
  return sortMenus(menus).flatMap(mapMenuNode)
}

// 持久化菜单数据，便于刷新后先使用缓存展示。
export function saveMenuItems(items: AppMenuItem[]) {
  window.localStorage.setItem(APP_MENU_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(APP_MENU_UPDATED_EVENT))
}

// 读取本地缓存的菜单数据。
export function loadMenuItems() {
  const rawValue = window.localStorage.getItem(APP_MENU_STORAGE_KEY)

  if (!rawValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(rawValue) as AppMenuItem[]
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

// 退出登录时清理菜单缓存，避免串用户数据。
export function clearMenuItems() {
  window.localStorage.removeItem(APP_MENU_STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(APP_MENU_UPDATED_EVENT))
}

// 根据当前路径找到最匹配的菜单项，便于路由兜底和标题展示。
export function findMenuItemByPath(items: AppMenuItem[], currentPath: string) {
  return items
    .filter((item) => isMenuPathMatched(item.path, currentPath))
    .sort((left, right) => right.path.length - left.path.length)[0] ?? null
}

// 获取当前用户菜单并缓存结果，供侧边栏渲染使用。
export async function fetchMenuItems() {
  const response = await authApi.authMenus()
  const nextItems = mapAuthMenusToAppMenus(response.data.data ?? [])
  saveMenuItems(nextItems)
  return nextItems
}
