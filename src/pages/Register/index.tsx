import type { FormEvent } from 'react'
import { useState } from 'react'
import { Button, Stack, TextInput } from '@mantine/core'
import { authApi } from '../../common/api'
import { useAppMessage } from '../../common/message/AppMessageProvider'
import { PasswordField } from '../../common/components/PasswordField'
import { AuthLayout } from '../../layout/AuthLayout'
import { navigateTo } from '../../router/navigation'
import { routes } from '../../router/routes'

type RegisterFormState = {
  username: string
  email: string
  password: string
  confirmPassword: string
}

// 注册页，负责创建账号并在成功后引导用户前往登录。
export function RegisterPage() {
  const [form, setForm] = useState<RegisterFormState>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const message = useAppMessage()

  // 更新注册表单字段，避免每个输入框重复写状态逻辑。
  function updateField<Key extends keyof RegisterFormState>(
    key: Key,
    value: RegisterFormState[Key],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  // 校验注册信息后提交接口，请求成功则跳转到登录页。
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (form.password !== form.confirmPassword) {
      message.error('两次输入的密码不一致，请重新确认。')
      return
    }

    setIsSubmitting(true)

    try {
      await authApi.authRegister({
        request: {
          username: form.username,
          email: form.email,
          password: form.password,
        },
      })

      message.success('注册成功，正在跳转到登录页。')
      window.setTimeout(() => {
        navigateTo(routes.login, true)
      }, 800)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '注册失败，请稍后重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="创建账号"
      subtitle="先注册一个账户，后续就可以把目标交给系统进行拆解与推进。"
      alternateText="已经有账号了？"
      alternateActionLabel="去登录"
      alternateActionPath={routes.login}
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

          <TextInput
            type="email"
            label="邮箱"
            placeholder="you@example.com"
            value={form.email}
            onChange={(event) => updateField('email', event.currentTarget.value)}
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

          <PasswordField
            label="确认密码"
            placeholder="请再次输入密码"
            value={form.confirmPassword}
            onChange={(value) => updateField('confirmPassword', value)}
          />

          <Button type="submit" size="md" radius="md" loading={isSubmitting}>
            {isSubmitting ? '注册中...' : '注册'}
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  )
}
