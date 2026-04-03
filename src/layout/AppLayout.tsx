import type { PropsWithChildren } from 'react'
import { AppHeader } from '../common/components/AppHeader'
import { AppSidebar } from '../common/components/AppSidebar'
import { routes } from '../router/routes'

const menuItems = [
  {
    key: 'dashboard',
    label: '仪表盘',
    description: '查看目标与任务总览',
    path: routes.dashboard,
  },
  {
    key: 'goals',
    label: '目标中心',
    description: '管理目标与拆解计划',
    path: routes.goals,
  },
  {
    key: 'plans',
    label: '计划管理',
    description: '查看阶段与执行路径',
    path: routes.plans,
  },
  {
    key: 'tasks',
    label: '任务看板',
    description: '跟踪任务状态与优先级',
    path: routes.tasks,
  },
  {
    key: 'settings',
    label: '系统设置',
    description: '个人信息与系统偏好',
    path: routes.settings,
  },
] as const

type AppLayoutProps = PropsWithChildren<{
  activeKey: (typeof menuItems)[number]['key']
  headerTitle: string
  headerSubtitle: string
}>

// 页面公共骨架，统一承载侧边栏、顶部导航和页面内容区。
export function AppLayout({
  children,
  activeKey,
  headerTitle,
  headerSubtitle,
}: AppLayoutProps) {
  return (
    <div className="app-shell">
      <AppSidebar
        title="Goal Planner"
        subtitle="AI Goal Planner"
        items={menuItems}
        activeKey={activeKey}
      />
      <div className="app-frame">
        <AppHeader title={headerTitle} subtitle={headerSubtitle} />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
