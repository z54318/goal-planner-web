import type { PropsWithChildren } from 'react'
import { Anchor, Box, Button, Paper, Stack, Text, Title } from '@mantine/core'
import { navigateTo } from '../router/navigation'
import { routes } from '../router/routes'
import './AuthLayout.css'

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
      <Paper className="auth-brand-panel" radius="xl" p="xl">
        <Text className="auth-brand-eyebrow">目标规划系统</Text>
        <Title order={1}>让模糊目标变成可执行的阶段与任务</Title>
        <Text className="auth-brand-copy">
          登录后你可以创建目标、生成 AI 计划、管理阶段任务并持续跟踪执行进度。
        </Text>
        <Button
          variant="light"
          color="blue"
          radius="xl"
          className="auth-secondary-link"
          onClick={() => navigateTo(routes.dashboard)}
        >
          查看工作台预览
        </Button>
      </Paper>

      <Paper className="auth-card" radius="xl" p="xl">
        <Stack gap="xs" className="auth-card-header">
          <Text className="auth-card-eyebrow">账号访问</Text>
          <Title order={2}>{title}</Title>
          <Text className="auth-card-copy">{subtitle}</Text>
        </Stack>

        {children}

        <Box className="auth-card-footer">
          <Text c="dimmed">{alternateText}</Text>
          <Anchor
            component="button"
            type="button"
            className="auth-inline-link"
            onClick={() => navigateTo(alternateActionPath)}
          >
            {alternateActionLabel}
          </Anchor>
        </Box>
      </Paper>
    </div>
  )
}
