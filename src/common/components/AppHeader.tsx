import { Avatar, Button, Group, Menu, Paper, Text } from '@mantine/core'
import {
  clearAuthToken,
  clearAuthUsername,
  getAuthUsername,
} from '../auth/token'
import { clearMenuItems } from '../menu/app-menu'
import { navigateTo } from '../../router/navigation'
import { routes } from '../../router/routes'
import './AppHeader.css'

type AppHeaderProps = {
  title?: string
}

// 顶部公共导航栏，后续可扩展用户信息、面包屑和全局操作。
export function AppHeader({ title: _title }: AppHeaderProps) {
  const username = getAuthUsername() || '用户'
  const avatarText = username.slice(0, 2).toUpperCase()

  // 退出登录并回到登录页。
  function handleLogout() {
    clearAuthToken()
    clearAuthUsername()
    clearMenuItems()
    navigateTo(routes.login, true)
  }

  return (
    <Paper className="app-header" radius={0} shadow="none">
      <Group justify="flex-end" className="app-header-actions">
        <Menu position="bottom-end" shadow="md" width={180}>
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              className="header-user-card"
              rightSection={<Text c="dimmed" size="sm">▾</Text>}
            >
              <Group gap="sm" wrap="nowrap">
                <Avatar color="blue" radius="xl">
                  {avatarText}
                </Avatar>
                <div>
                  <Text fw={700} c="dark.7">
                    {username}
                  </Text>
                  <Text size="xs" c="dimmed">
                    昵称
                  </Text>
                </div>
              </Group>
            </Button>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item onClick={handleLogout}>退出登录</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Paper>
  )
}
