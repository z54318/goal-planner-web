import { useEffect } from 'react'
import { getAuthToken } from '../common/auth/token'
import { AppLayout } from '../layout/AppLayout'
import { HomePage } from '../pages/Home'
import { LoginPage } from '../pages/Login'
import { ModulePage } from '../pages/Module'
import { RegisterPage } from '../pages/Register'
import { navigateTo, useCurrentPath } from './navigation'
import { routes } from './routes'

// 路由统一从这里收口，后续接入 react-router-dom 时可直接扩展。
export function AppRouter() {
  const currentPath = useCurrentPath()
  const hasToken = Boolean(getAuthToken())
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

  if (currentPath === routes.goals) {
    return (
      <AppLayout
        activeKey="goals"
        headerTitle="目标中心"
        headerSubtitle="创建目标、查看 AI 拆解结果，并持续优化执行计划。"
      >
        <ModulePage
          eyebrow="Goals Center"
          title="目标中心模块待接入"
          description="这里将承载目标列表、新建目标、AI 结果确认和目标详情等页面。"
        />
      </AppLayout>
    )
  }

  if (currentPath === routes.plans) {
    return (
      <AppLayout
        activeKey="plans"
        headerTitle="计划管理"
        headerSubtitle="查看阶段结构、编辑 AI 生成计划，并管理任务顺序。"
      >
        <ModulePage
          eyebrow="Plan Management"
          title="计划管理模块待接入"
          description="这里将放计划详情、阶段任务编辑、计划优化与重新生成等内容。"
        />
      </AppLayout>
    )
  }

  if (currentPath === routes.tasks) {
    return (
      <AppLayout
        activeKey="tasks"
        headerTitle="任务看板"
        headerSubtitle="跟踪 todo、doing、done 状态，并查看优先级和截止时间。"
      >
        <ModulePage
          eyebrow="Task Board"
          title="任务看板模块待接入"
          description="这里将承载任务列表、状态切换、优先级调整和执行跟踪能力。"
        />
      </AppLayout>
    )
  }

  if (currentPath === routes.settings) {
    return (
      <AppLayout
        activeKey="settings"
        headerTitle="系统设置"
        headerSubtitle="管理个人信息、账号偏好和后续系统设置能力。"
      >
        <ModulePage
          eyebrow="Settings"
          title="系统设置模块待接入"
          description="这里后续会接入个人资料、通知配置和账号安全相关页面。"
        />
      </AppLayout>
    )
  }

  return (
    <AppLayout
      activeKey="dashboard"
      headerTitle="目标执行工作台"
      headerSubtitle="顶部导航和左侧菜单是公共区域，具体模块页面会在内容区切换。"
    >
      <HomePage />
    </AppLayout>
  )
}
