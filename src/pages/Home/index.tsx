// 首页占位页，当前用于承接后台工作台的内容区域。
export function HomePage() {
  return (
    <section className="dashboard-shell">
      <div className="dashboard-hero">
        <div>
          <p className="page-eyebrow">Workspace Overview</p>
          <h1>页面架子已经切到后台工作台布局</h1>
          <p className="page-description">
            左侧是全局菜单，顶部是统一导航栏，中间区域保留给具体模块页面。
          </p>
        </div>
        <div className="hero-panel">
          <span className="hero-panel-label">当前阶段</span>
          <strong>前端基础骨架搭建中</strong>
          <p>后续可在这里接入用户信息、统计卡片、快捷入口和面包屑。</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card">
          <p className="card-label">API</p>
          <h3>后端联通方式</h3>
          <p>
            开发环境统一请求 <code>/api/*</code>，由 Vite 代理到
            <code>http://localhost:8080</code>。
          </p>
        </article>

        <article className="dashboard-card">
          <p className="card-label">Layout</p>
          <h3>全局布局</h3>
          <p>统一承载侧边栏、头部导航和内容区域，后续页面可直接复用。</p>
        </article>

        <article className="dashboard-card">
          <p className="card-label">Menu</p>
          <h3>菜单占位</h3>
          <p>当前为静态假数据，后续替换为后端返回的菜单配置即可。</p>
        </article>

        <article className="dashboard-card">
          <p className="card-label">Pages</p>
          <h3>模块承载区</h3>
          <p>后续仪表盘、目标中心、计划管理、任务看板都放在这里切换。</p>
        </article>
      </div>
    </section>
  )
}
