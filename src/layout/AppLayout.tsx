import type { PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'
import { AppShell } from '@mantine/core'
import { AppHeader } from '../common/components/AppHeader'
import { AppSidebar } from '../common/components/AppSidebar'
import {
  APP_MENU_UPDATED_EVENT,
  fetchMenuItems,
  loadMenuItems,
} from '../common/menu/app-menu'
import './AppLayout.css'

type AppLayoutProps = PropsWithChildren<{
  activePath: string
  headerTitle: string
}>

// 页面公共骨架，统一承载侧边栏、顶部导航和页面内容区。
export function AppLayout({
  children,
  activePath,
  headerTitle,
}: AppLayoutProps) {
  const [menuItems, setMenuItems] = useState(() => loadMenuItems())

  useEffect(() => {
    let isMounted = true

    function handleMenuUpdated() {
      setMenuItems(loadMenuItems())
    }

    fetchMenuItems()
      .then((items) => {
        if (isMounted) {
          setMenuItems(items)
        }
      })
      .catch(() => {
        if (isMounted) {
          setMenuItems(loadMenuItems())
        }
      })

    window.addEventListener(APP_MENU_UPDATED_EVENT, handleMenuUpdated)

    return () => {
      isMounted = false
      window.removeEventListener(APP_MENU_UPDATED_EVENT, handleMenuUpdated)
    }
  }, [])

  return (
    <AppShell
      className="app-shell"
      header={{ height: 88 }}
      navbar={{ width: 292, breakpoint: 'sm' }}
      padding="lg"
    >
      <AppShell.Navbar withBorder={false}>
        <AppSidebar
          title="目标规划"
          items={menuItems}
          activePath={activePath}
        />
      </AppShell.Navbar>

      <AppShell.Header withBorder={false}>
        <AppHeader title={headerTitle} />
      </AppShell.Header>

      <AppShell.Main className="app-main">{children}</AppShell.Main>
    </AppShell>
  )
}
