import type { FormEvent } from 'react'
import { useState } from 'react'
import { authApi } from '../../common/api'
import { extractAuthToken, setAuthToken } from '../../common/auth/token'
import { PasswordField } from '../../common/components/PasswordField'
import { AuthLayout } from '../../layout/AuthLayout'
import { navigateTo } from '../../router/navigation'
import { routes } from '../../router/routes'

type LoginFormState = {
  username: string
  password: string
}

// 登录页，负责提交账号信息并在成功后写入本地登录态。
export function LoginPage() {
  const [form, setForm] = useState<LoginFormState>({
    username: '',
    password: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 更新表单字段，保持输入状态与界面同步。
  function updateField<Key extends keyof LoginFormState>(
    key: Key,
    value: LoginFormState[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  // 提交登录请求，登录成功后跳转到工作台首页。
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setIsSubmitting(true)

    try {
      const response = await authApi.authLogin({
        request: form,
      })
      const token = extractAuthToken(response.data)

      if (token) {
        setAuthToken(token)
      }

      setSuccessMessage('登录成功，正在进入工作台。')
      navigateTo(routes.dashboard, true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败，请稍后重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="欢迎回来"
      subtitle="输入用户名和密码，继续管理你的目标计划与任务进度。"
      alternateText="还没有账号？"
      alternateActionLabel="去注册"
      alternateActionPath={routes.register}
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>用户名</span>
          <input
            type="text"
            placeholder="请输入用户名"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            required
          />
        </label>

        <PasswordField
          label="密码"
          placeholder="请输入登录密码"
          value={form.password}
          onChange={(value) => updateField('password', value)}
        />

        {errorMessage ? <p className="auth-feedback is-error">{errorMessage}</p> : null}
        {successMessage ? (
          <p className="auth-feedback is-success">{successMessage}</p>
        ) : null}

        <button type="submit" className="auth-submit-button" disabled={isSubmitting}>
          {isSubmitting ? '登录中...' : '登录'}
        </button>
      </form>
    </AuthLayout>
  )
}
