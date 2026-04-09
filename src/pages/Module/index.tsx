import { Paper, Text, Title } from '@mantine/core'
import './index.css'

type ModulePageProps = {
  title: string
}

// 通用模块占位页，用于承接还未开始开发的业务页面。
export function ModulePage({ title }: ModulePageProps) {
  return (
    <Paper className="module-shell" radius="xl" p="xl">
      <Title order={1}>{title}</Title>
      <Text mt="sm" c="dimmed">该模块页面已占位，后续可以继续在这里接入具体业务能力。</Text>
    </Paper>
  )
}
