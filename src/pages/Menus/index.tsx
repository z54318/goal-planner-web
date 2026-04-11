import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import type { MenuCreateMenuRequest, MenuMenu } from '../../common/api'
import { menusApi } from '../../common/api'
import { fetchMenuItems } from '../../common/menu/app-menu'
import { useAppMessage } from '../../common/message/AppMessageProvider'
import { formatDateTime } from '../../common/utils/date'
import './index.css'

type MenuModalMode = 'create' | 'edit'

type MenuFormState = {
  name: string
  path: string
  component: string
  icon: string
  permission_code: string
  parent_id: string
  sort_order: string
  hidden: boolean
}

type FlatMenuItem = {
  depth: number
  menu: MenuMenu
}

const emptyFormState: MenuFormState = {
  name: '',
  path: '',
  component: '',
  icon: '',
  permission_code: '',
  parent_id: '0',
  sort_order: '0',
  hidden: false,
}

function flattenMenus(menus: MenuMenu[], depth = 0): FlatMenuItem[] {
  return menus.flatMap((menu) => [
    {
      depth,
      menu,
    },
    ...flattenMenus(menu.children ?? [], depth + 1),
  ])
}

function findMenuById(menus: MenuMenu[], id: number): MenuMenu | null {
  for (const menu of menus) {
    if (menu.id === id) {
      return menu
    }

    const matchedChild = findMenuById(menu.children ?? [], id)

    if (matchedChild) {
      return matchedChild
    }
  }

  return null
}

function collectDescendantIds(menu: MenuMenu) {
  const ids = new Set<number>()

  function walk(nodes: MenuMenu[]) {
    nodes.forEach((node) => {
      if (node.id) {
        ids.add(node.id)
      }

      walk(node.children ?? [])
    })
  }

  if (menu.id) {
    ids.add(menu.id)
  }

  walk(menu.children ?? [])

  return ids
}

function normalizeMenuPath(path: string) {
  const nextPath = path.trim()

  if (!nextPath) {
    return undefined
  }

  return nextPath.startsWith('/') ? nextPath : `/${nextPath}`
}

function toMenuRequestPayload(form: MenuFormState): MenuCreateMenuRequest {
  const parentId = Number(form.parent_id)
  const sortOrder = Number(form.sort_order)

  return {
    name: form.name.trim() || undefined,
    path: normalizeMenuPath(form.path),
    component: form.component.trim() || undefined,
    icon: form.icon.trim() || undefined,
    permission_code: form.permission_code.trim() || undefined,
    parent_id: Number.isNaN(parentId) ? 0 : parentId,
    sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
    hidden: form.hidden,
  }
}

function toMenuFormState(menu: MenuMenu): MenuFormState {
  return {
    name: menu.name ?? '',
    path: menu.path ?? '',
    component: menu.component ?? '',
    icon: menu.icon ?? '',
    permission_code: menu.permission_code ?? '',
    parent_id: String(menu.parent_id ?? 0),
    sort_order: String(menu.sort_order ?? 0),
    hidden: Boolean(menu.hidden),
  }
}

export function MenusPage() {
  const [menuTree, setMenuTree] = useState<MenuMenu[]>([])
  const [isListLoading, setIsListLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<MenuModalMode>('create')
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null)
  const [editingMenu, setEditingMenu] = useState<MenuMenu | null>(null)
  const [form, setForm] = useState<MenuFormState>(emptyFormState)
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingMenuId, setDeletingMenuId] = useState<number | null>(null)
  const message = useAppMessage()

  const flatMenus = flattenMenus(menuTree)
  const editingTreeNode = editingMenuId ? findMenuById(menuTree, editingMenuId) : null
  const forbiddenParentIds =
    modalMode === 'edit' && editingTreeNode ? collectDescendantIds(editingTreeNode) : new Set<number>()
  const parentMenuOptions = flatMenus.filter((item) => {
    if (!item.menu.id) {
      return false
    }

    return !forbiddenParentIds.has(item.menu.id)
  })

  function updateField<Key extends keyof MenuFormState>(key: Key, value: MenuFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  async function refreshSidebarMenus() {
    await fetchMenuItems().catch(() => undefined)
  }

  async function loadMenuList() {
    setIsListLoading(true)

    try {
      const response = await menusApi.adminMenusList()
      setMenuTree(response.data.data ?? [])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取菜单列表失败。')
    } finally {
      setIsListLoading(false)
    }
  }

  function closeModal() {
    setIsModalOpen(false)
    setIsModalLoading(false)
    setEditingMenuId(null)
    setEditingMenu(null)
    setForm(emptyFormState)
  }

  function openCreateModal(parentId = 0) {
    setModalMode('create')
    setEditingMenuId(null)
    setEditingMenu(null)
    setForm({
      ...emptyFormState,
      parent_id: String(parentId),
    })
    setIsModalLoading(false)
    setIsModalOpen(true)
  }

  async function openEditModal(menuId: number) {
    setModalMode('edit')
    setEditingMenuId(menuId)
    setEditingMenu(null)
    setIsModalLoading(true)
    setIsModalOpen(true)

    try {
      const response = await menusApi.adminMenuGet({
        id: menuId,
      })
      const nextMenu = response.data.data ?? findMenuById(menuTree, menuId)

      if (!nextMenu) {
        throw new Error('菜单详情不存在。')
      }

      setEditingMenu(nextMenu)
      setForm(toMenuFormState(nextMenu))
    } catch (error) {
      setIsModalOpen(false)
      message.error(error instanceof Error ? error.message : '获取菜单详情失败。')
    } finally {
      setIsModalLoading(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.name.trim()) {
      message.error('请输入菜单名称。')
      return
    }

    if (!form.path.trim()) {
      message.error('请输入菜单路径。')
      return
    }

    setIsSubmitting(true)

    try {
      const request = toMenuRequestPayload(form)

      if (modalMode === 'create') {
        await menusApi.adminMenuCreate({
          request,
        })
        message.success('菜单创建成功。')
      } else {
        if (!editingMenuId) {
          throw new Error('请先选择需要编辑的菜单。')
        }

        await menusApi.adminMenuUpdate({
          id: editingMenuId,
          request,
        })
        message.success('菜单更新成功。')
      }

      await refreshSidebarMenus()
      await loadMenuList()
      closeModal()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存菜单失败。')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDeleteMenu(menu: MenuMenu) {
    if (!menu.id) {
      return
    }

    const confirmed = window.confirm(`确定删除菜单“${menu.name ?? '未命名菜单'}”吗？`)

    if (!confirmed) {
      return
    }

    setDeletingMenuId(menu.id)

    try {
      await menusApi.adminMenuDelete({
        id: menu.id,
      })

      await refreshSidebarMenus()
      await loadMenuList()
      message.success('菜单已删除。')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除菜单失败。')
    } finally {
      setDeletingMenuId(null)
    }
  }

  useEffect(() => {
    void loadMenuList()
  }, [])

  return (
    <>
      <section className="menus-shell">
        <Paper className="menus-page-header" radius="xl" p="xl">
          <div>
            <Title order={1}>菜单管理</Title>
            <Text className="menus-page-description" mt="sm" c="dimmed">
              页面直接展示完整菜单列表，新增菜单通过弹窗完成，适合快速维护后台导航结构。
            </Text>
          </div>

          <Button onClick={() => openCreateModal()}>
            新增菜单
          </Button>
        </Paper>

        <Paper className="menus-board" radius="xl" p="lg">
          <Table.ScrollContainer minWidth={980}>
            <Table className="menus-table" highlightOnHover withTableBorder>
              <thead>
                <tr>
                  <th scope="col">菜单</th>
                  <th scope="col">路由路径</th>
                  <th scope="col">组件路径</th>
                  <th scope="col">权限码</th>
                  <th scope="col">状态</th>
                  <th scope="col">排序</th>
                  <th scope="col">更新时间</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>

              <tbody>
                {flatMenus.length > 0 ? (
                  flatMenus.map(({ menu, depth }) => (
                    <tr key={menu.id ?? `${menu.path}-${menu.name}`} className="menus-row">
                      <td className="menus-cell menus-cell-primary" data-label="菜单">
                        <div
                          className="menus-name-block"
                          style={{ paddingLeft: `${20 + depth * 24}px` }}
                        >
                          <Text fw={700}>{menu.name || '未命名菜单'}</Text>
                          <Text size="sm" c="dimmed">{depth > 0 ? `第 ${depth + 1} 层菜单` : '顶级菜单'}</Text>
                        </div>
                      </td>

                      <td className="menus-cell" data-label="路由路径">
                        <Text component="code">{menu.path || '-'}</Text>
                      </td>

                      <td className="menus-cell" data-label="组件路径">
                        <Text>{menu.component || '-'}</Text>
                      </td>

                      <td className="menus-cell" data-label="权限码">
                        <Text>{menu.permission_code || '-'}</Text>
                      </td>

                      <td className="menus-cell" data-label="状态">
                        <Badge className={`menus-status-tag${menu.hidden ? ' is-hidden' : ''}`} variant="light" color={menu.hidden ? 'gray' : 'green'}>
                          {menu.hidden ? '隐藏' : '显示'}
                        </Badge>
                      </td>

                      <td className="menus-cell" data-label="排序">
                        <Text>{menu.sort_order ?? 0}</Text>
                      </td>

                      <td className="menus-cell" data-label="更新时间">
                        <Text>{formatDateTime(menu.updated_at)}</Text>
                      </td>

                      <td className="menus-cell menus-actions-cell" data-label="操作">
                        <Group gap="xs">
                          <Button
                            variant="light"
                            onClick={() => {
                              if (!menu.id) {
                                return
                              }

                              void openEditModal(menu.id)
                            }}
                          >
                            编辑
                          </Button>
                          <Button variant="light" color="gray" onClick={() => openCreateModal(menu.id ?? 0)}>
                            新增子菜单
                          </Button>
                          <Button
                            color="red"
                            variant="light"
                            onClick={() => void handleDeleteMenu(menu)}
                            loading={deletingMenuId === menu.id}
                          >
                            {deletingMenuId === menu.id ? '删除中...' : '删除'}
                          </Button>
                        </Group>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <div className="menus-empty-state">
                        <Title order={2}>{isListLoading ? '菜单加载中...' : '当前还没有菜单'}</Title>
                        <Text c="dimmed">先点击右上角“新增菜单”，通过弹窗创建一个顶级菜单。</Text>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Table.ScrollContainer>
        </Paper>
      </section>

      <Modal
        opened={isModalOpen}
        onClose={closeModal}
        title={modalMode === 'create' ? '新增菜单' : '编辑菜单'}
        centered
        radius="md"
        size="lg"
      >
        <Text c="dimmed" mb="md">
          {modalMode === 'create'
            ? '填写菜单信息后提交，创建成功会自动刷新菜单列表和左侧导航。'
            : '修改菜单信息后保存，当前页面和左侧导航都会同步更新。'}
        </Text>

        {isModalLoading ? (
          <div className="menus-modal-loading">
            <Text c="dimmed">菜单详情加载中...</Text>
          </div>
        ) : (
          <form className="menus-form" onSubmit={handleSubmit}>
            <Stack gap="md">
              <div className="menus-form-grid">
                <TextInput
                  className="menus-field"
                  label="菜单名称"
                  value={form.name}
                  onChange={(event) => updateField('name', event.currentTarget.value)}
                  placeholder="例如：菜单管理"
                  required
                />

                <TextInput
                  className="menus-field"
                  label="路由路径"
                  value={form.path}
                  onChange={(event) => updateField('path', event.currentTarget.value)}
                  placeholder="例如：/menus"
                  required
                />
              </div>

              <div className="menus-form-grid">
                <TextInput
                  className="menus-field"
                  label="组件路径"
                  value={form.component}
                  onChange={(event) => updateField('component', event.currentTarget.value)}
                  placeholder="例如：pages/Menus/index"
                />

                <TextInput
                  className="menus-field"
                  label="权限码"
                  value={form.permission_code}
                  onChange={(event) => updateField('permission_code', event.currentTarget.value)}
                  placeholder="例如：admin:menus:list"
                />
              </div>

              <div className="menus-form-grid">
                <TextInput
                  className="menus-field"
                  label="图标"
                  value={form.icon}
                  onChange={(event) => updateField('icon', event.currentTarget.value)}
                  placeholder="例如：setting"
                />

                <Select
                  className="menus-field"
                  label="上级菜单"
                  value={form.parent_id}
                  data={[
                    { value: '0', label: '顶级菜单' },
                    ...parentMenuOptions.map(({ menu, depth }) => ({
                      value: String(menu.id),
                      label: `${'— '.repeat(depth)}${menu.name || menu.path || `菜单 ${menu.id}`}`,
                    })),
                  ]}
                  onChange={(value) => updateField('parent_id', value ?? '0')}
                />
              </div>

              <div className="menus-form-grid">
                <TextInput
                  className="menus-field"
                  label="排序值"
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => updateField('sort_order', event.currentTarget.value)}
                  placeholder="默认 0"
                />

                <Checkbox
                  className="menus-checkbox-field"
                  label="隐藏菜单"
                  checked={form.hidden}
                  onChange={(event) => updateField('hidden', event.currentTarget.checked)}
                  mt={30}
                />
              </div>

              <Group justify="flex-end" className="menus-form-actions">
                <Button
                  variant="light"
                  color="gray"
                  onClick={() => {
                    if (modalMode === 'edit' && editingMenu) {
                      setForm(toMenuFormState(editingMenu))
                      return
                    }

                    setForm(emptyFormState)
                  }}
                >
                  重置
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  {isSubmitting
                    ? '保存中...'
                    : modalMode === 'create'
                      ? '创建菜单'
                      : '保存修改'}
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </>
  )
}
