type AppHeaderProps = {
  title: string
  subtitle: string
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
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
        <button type="button" className="header-primary-button">
          新建目标
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
