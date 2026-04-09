import type { FormEvent } from 'react'
import { useState } from 'react'
import { Button, Stack, TextInput } from '@mantine/core'
import { authApi } from '../../common/api'
import {
  clearAuthToken,
  clearAuthUsername,
  extractAuthToken,
  setAuthToken,
  setAuthUsername,
} from '../../common/auth/token'
import { fetchMenuItems } from '../../common/menu/app-menu'
import { useAppMessage } from '../../common/message/AppMessageProvider'
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const message = useAppMessage()

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
    setIsSubmitting(true)
    clearAuthToken()
    clearAuthUsername()

    try {
      const response = await authApi.authLogin({
        request: form,
      })
      const token = extractAuthToken(response.data)
      const username = response.data.data?.username || form.username

      if (!token) {
        throw new Error('登录成功，但接口未返回有效 token。')
      }

      setAuthToken(token)
      setAuthUsername(username)
      await fetchMenuItems().catch(() => undefined)

      message.success('登录成功，正在进入工作台。')
      navigateTo(routes.dashboard, true)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败，请稍后重试。')
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
        <Stack gap="md">
          <TextInput
            label="用户名"
            placeholder="请输入用户名"
            value={form.username}
            onChange={(event) => updateField('username', event.currentTarget.value)}
            radius="md"
            size="md"
            required
          />

          <PasswordField
            label="密码"
            placeholder="请输入登录密码"
            value={form.password}
            onChange={(value) => updateField('password', value)}
          />

          <Button type="submit" size="md" radius="md" loading={isSubmitting}>
            {isSubmitting ? '登录中...' : '登录'}
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  )
}
