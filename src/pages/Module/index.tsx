type ModulePageProps = {
  eyebrow: string
  title: string
  description: string
}

// 通用模块占位页，用于承接还未开始开发的业务页面。
export function ModulePage({ eyebrow, title, description }: ModulePageProps) {
  return (
    <section className="module-shell">
      <p className="page-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="page-description">{description}</p>
    </section>
  )
}
