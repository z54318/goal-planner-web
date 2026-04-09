import { Box, Paper, ScrollArea, Stack, Text, Title } from '@mantine/core'
import { navigateTo } from '../../router/navigation'
import type { AppMenuItem } from '../../common/menu/app-menu'
import './AppSidebar.css'

type AppSidebarProps = {
  title: string
  items: readonly AppMenuItem[]
  activePath: string
}

// 左侧菜单栏组件，后续可直接替换为接口返回的菜单数据。
export function AppSidebar({
  title,
  items,
  activePath,
}: AppSidebarProps) {
  return (
    <Paper className="app-sidebar" radius={0} shadow="none">
      <Box className="sidebar-brand">
        <Title order={1}>{title}</Title>
      </Box>

      <ScrollArea className="sidebar-scroll" type="never">
        <Stack className="sidebar-nav" gap="sm" aria-label="主导航" component="nav">
        {items.length > 0 ? (
          items.map((item) => {
            const isActive =
              item.path === '/'
                ? activePath === '/'
                : activePath === item.path || activePath.startsWith(`${item.path}/`)

            return (
              <button
                key={item.key}
                type="button"
                className={`sidebar-link${isActive ? ' is-active' : ''}`}
                onClick={() => navigateTo(item.path)}
              >
                <Text className="sidebar-link-label">{item.label}</Text>
              </button>
            )
          })
        ) : (
          <Paper className="sidebar-empty-state" radius="lg" p="md">
            <Text fw={700}>暂无菜单</Text>
          </Paper>
        )}
        </Stack>
      </ScrollArea>
    </Paper>
  )
}
