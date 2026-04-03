import type { PropsWithChildren } from 'react'
import { AppHeader } from '../common/components/AppHeader'
import { AppSidebar } from '../common/components/AppSidebar'

const menuItems = [
  { key: 'dashboard', label: '仪表盘', description: '查看目标与任务总览' },
  { key: 'goals', label: '目标中心', description: '管理目标与拆解计划' },
  { key: 'plans', label: '计划管理', description: '查看阶段与执行路径' },
  { key: 'tasks', label: '任务看板', description: '跟踪任务状态与优先级' },
  { key: 'settings', label: '系统设置', description: '个人信息与系统偏好' },
] as const

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <AppSidebar
        title="Goal Planner"
        subtitle="AI Goal Planner"
        items={menuItems}
        activeKey="dashboard"
      />
      <div className="app-frame">
        <AppHeader
          title="目标执行工作台"
          subtitle="顶部导航和左侧菜单是公共区域，具体模块页面会在内容区切换。"
        />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
