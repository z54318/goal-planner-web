import type { PropsWithChildren } from 'react'
import { navigateTo } from '../router/navigation'
import { routes } from '../router/routes'

type AuthLayoutProps = PropsWithChildren<{
  title: string
  subtitle: string
  alternateText: string
  alternateActionLabel: string
  alternateActionPath: string
}>

// 登录注册共用的认证布局，统一承载表单卡片和品牌介绍区域。
export function AuthLayout({
  children,
  title,
  subtitle,
  alternateText,
  alternateActionLabel,
  alternateActionPath,
}: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <section className="auth-brand-panel">
        <p className="auth-brand-eyebrow">AI Goal Planner</p>
        <h1>让模糊目标变成可执行的阶段与任务</h1>
        <p className="auth-brand-copy">
          登录后你可以创建目标、生成 AI 计划、管理阶段任务并持续跟踪执行进度。
        </p>
        <button
          type="button"
          className="auth-secondary-link"
          onClick={() => navigateTo(routes.dashboard)}
        >
          查看工作台预览
        </button>
      </section>

      <section className="auth-card">
        <div className="auth-card-header">
          <p className="page-eyebrow">Account Access</p>
          <h2>{title}</h2>
          <p className="auth-card-copy">{subtitle}</p>
        </div>

        {children}

        <div className="auth-card-footer">
          <span>{alternateText}</span>
          <button
            type="button"
            className="auth-inline-link"
            onClick={() => navigateTo(alternateActionPath)}
          >
            {alternateActionLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
