import { clearAuthToken } from '../auth/token'
import { navigateTo } from '../../router/navigation'
import { routes } from '../../router/routes'

type AppHeaderProps = {
  title: string
  subtitle: string
}

// 顶部公共导航栏，后续可扩展用户信息、面包屑和全局操作。
export function AppHeader({ title, subtitle }: AppHeaderProps) {
  // 清理登录令牌并跳转回登录页，提供最基础的退出能力。
  function handleLogout() {
    clearAuthToken()
    navigateTo(routes.login, true)
  }

  return (
    <header className="app-header">
      <div>
        <p className="app-header-eyebrow">Global Navigation</p>
        <h2>{title}</h2>
        <p className="app-header-subtitle">{subtitle}</p>
      </div>

      <div className="app-header-actions">
        <button type="button" className="header-ghost-button">
          消息中心
        </button>
        <button
          type="button"
          className="header-primary-button"
          onClick={handleLogout}
        >
          退出登录
        </button>
        <div className="header-user-card" aria-label="当前用户">
          <span className="header-user-avatar">GP</span>
          <div>
            <strong>Goal Planner</strong>
            <span>Frontend Shell</span>
          </div>
        </div>
      </div>
    </header>
  )
}
