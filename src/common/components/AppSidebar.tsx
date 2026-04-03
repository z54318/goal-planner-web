import { navigateTo } from '../../router/navigation'

type SidebarItem = {
  key: string
  label: string
  description: string
  path: string
}

type AppSidebarProps = {
  title: string
  subtitle: string
  items: readonly SidebarItem[]
  activeKey: string
}

// 左侧菜单栏组件，后续可直接替换为接口返回的菜单数据。
export function AppSidebar({
  title,
  subtitle,
  items,
  activeKey,
}: AppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <p className="sidebar-eyebrow">{subtitle}</p>
        <h1>{title}</h1>
        <p className="sidebar-copy">
          菜单数据后续可以直接替换成后端返回的结果。
        </p>
      </div>

      <nav className="sidebar-nav" aria-label="主导航">
        {items.map((item) => {
          const isActive = item.key === activeKey

          return (
            <button
              key={item.key}
              type="button"
              className={`sidebar-link${isActive ? ' is-active' : ''}`}
              onClick={() => navigateTo(item.path)}
            >
              <span className="sidebar-link-title">{item.label}</span>
              <span className="sidebar-link-desc">{item.description}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <p>菜单架子已就位</p>
        <span>后续支持权限、动态图标和接口菜单。</span>
      </div>
    </aside>
  )
}
