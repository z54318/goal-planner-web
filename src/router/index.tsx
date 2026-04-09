import { useEffect } from 'react'
import { getAuthToken } from '../common/auth/token'
import { findMenuItemByPath, loadMenuItems } from '../common/menu/app-menu'
import { AppLayout } from '../layout/AppLayout'
import { GoalsPage } from '../pages/Goals'
import { HomePage } from '../pages/Home'
import { LoginPage } from '../pages/Login'
import { MenusPage } from '../pages/Menus'
import { PlansPage } from '../pages/Plans'
import { ModulePage } from '../pages/Module'
import { RegisterPage } from '../pages/Register'
import { SettingsPage } from '../pages/Settings'
import { TasksPage } from '../pages/Tasks'
import { navigateTo, useCurrentPath } from './navigation'
import { routes } from './routes'

function matchRoute(currentPath: string, routePath: string) {
  return currentPath === routePath || currentPath.startsWith(`${routePath}/`)
}

// 路由统一从这里收口，后续接入 react-router-dom 时可直接扩展。
export function AppRouter() {
  const currentPath = useCurrentPath()
  const hasToken = Boolean(getAuthToken())
  const isDashboardPath = currentPath === routes.dashboard || currentPath === '/dashboard'
  const isAuthPage =
    currentPath === routes.login || currentPath === routes.register

  // 最基础的鉴权守卫：未登录时跳回登录页，已登录时避免停留在认证页。
  useEffect(() => {
    if (!hasToken && !isAuthPage) {
      navigateTo(routes.login, true)
    }

    if (hasToken && isAuthPage) {
      navigateTo(routes.dashboard, true)
    }
  }, [currentPath, hasToken, isAuthPage])

  if (currentPath === routes.login) {
    return <LoginPage />
  }

  if (currentPath === routes.register) {
    return <RegisterPage />
  }

  if (!hasToken) {
    return <LoginPage />
  }

  if (matchRoute(currentPath, routes.goals)) {
    return (
      <AppLayout
        activePath={currentPath}
        headerTitle="目标中心"
      >
        <GoalsPage />
      </AppLayout>
    )
  }

  if (matchRoute(currentPath, routes.menus)) {
    return (
      <AppLayout
        activePath={currentPath}
        headerTitle="菜单管理"
      >
        <MenusPage />
      </AppLayout>
    )
  }

  if (matchRoute(currentPath, routes.plans)) {
    return (
      <AppLayout
        activePath={currentPath}
        headerTitle="计划管理"
      >
        <PlansPage />
      </AppLayout>
    )
  }

  if (matchRoute(currentPath, routes.tasks)) {
    return (
      <AppLayout
        activePath={currentPath}
        headerTitle="任务看板"
      >
        <TasksPage />
      </AppLayout>
    )
  }

  if (matchRoute(currentPath, routes.settings)) {
    return (
      <AppLayout
        activePath={currentPath}
        headerTitle="系统设置"
      >
        <SettingsPage />
      </AppLayout>
    )
  }

  const fallbackMenu = findMenuItemByPath(loadMenuItems(), currentPath)

  if (fallbackMenu && currentPath !== routes.dashboard) {
    return (
      <AppLayout
        activePath={currentPath}
        headerTitle={fallbackMenu.label}
      >
        <ModulePage title={fallbackMenu.label} />
      </AppLayout>
    )
  }

  if (isDashboardPath) {
    return (
      <AppLayout
        activePath={routes.dashboard}
        headerTitle="仪表盘"
      >
        <HomePage />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      activePath={currentPath}
      headerTitle="仪表盘"
    >
      <HomePage />
    </AppLayout>
  )
}
