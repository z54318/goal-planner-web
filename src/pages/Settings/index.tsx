import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import type { RbacPermission, RbacRole, UserUser } from "../../common/api";
import { rbacApi, usersApi } from "../../common/api";
import { fetchMenuItems } from "../../common/menu/app-menu";
import { useAppMessage } from "../../common/message/AppMessageProvider";
import { formatDateTime } from "../../common/utils/date";
import "./index.css";

type PermissionModalMode = "create" | "edit";

type PermissionFormState = {
  name: string;
  code: string;
};

const emptyPermissionForm: PermissionFormState = {
  name: "",
  code: "",
};

function sortPermissions(items: RbacPermission[]) {
  return [...items].sort((left, right) => {
    return (left.created_at ?? "").localeCompare(right.created_at ?? "");
  });
}

function sortUsers(items: UserUser[]) {
  return [...items].sort((left, right) => {
    return (left.created_at ?? "").localeCompare(right.created_at ?? "");
  });
}

export function SettingsPage() {
  const [permissions, setPermissions] = useState<RbacPermission[]>([]);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [users, setUsers] = useState<UserUser[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>(
    []
  );
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserRoleIds, setSelectedUserRoleIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRoleBindingLoading, setIsRoleBindingLoading] = useState(false);
  const [isRoleBindingSaving, setIsRoleBindingSaving] = useState(false);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isUserRolesSaving, setIsUserRolesSaving] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [permissionModalMode, setPermissionModalMode] =
    useState<PermissionModalMode>("create");
  const [editingPermissionId, setEditingPermissionId] = useState<number | null>(
    null
  );
  const [permissionForm, setPermissionForm] =
    useState<PermissionFormState>(emptyPermissionForm);
  const [isPermissionSaving, setIsPermissionSaving] = useState(false);
  const [deletingPermissionId, setDeletingPermissionId] = useState<
    number | null
  >(null);
  const message = useAppMessage();

  const sortedPermissions = useMemo(
    () => sortPermissions(permissions),
    [permissions]
  );
  const sortedUsers = useMemo(() => sortUsers(users), [users]);
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  function updatePermissionField<Key extends keyof PermissionFormState>(
    key: Key,
    value: PermissionFormState[Key]
  ) {
    setPermissionForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function refreshSidebarMenus() {
    await fetchMenuItems().catch(() => undefined);
  }

  async function loadRolePermissions(roleId: number) {
    setIsRoleBindingLoading(true);

    try {
      const response = await rbacApi.adminRolePermissionsGet({
        id: roleId,
      });
      setSelectedPermissionIds(response.data.data?.permission_ids ?? []);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "获取角色权限绑定失败。"
      );
    } finally {
      setIsRoleBindingLoading(false);
    }
  }

  async function loadRbacData() {
    setIsLoading(true);

    try {
      const [permissionsResponse, rolesResponse] = await Promise.all([
        rbacApi.adminPermissionsList(),
        rbacApi.adminRolesList(),
      ]);

      const nextPermissions = permissionsResponse.data.data ?? [];
      const nextRoles = rolesResponse.data.data ?? [];
      const resolvedRoleId = selectedRoleId ?? nextRoles[0]?.id ?? null;

      setPermissions(nextPermissions);
      setRoles(nextRoles);
      setSelectedRoleId(resolvedRoleId);

      if (resolvedRoleId) {
        await loadRolePermissions(resolvedRoleId);
      } else {
        setSelectedPermissionIds([]);
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "获取权限模块数据失败。"
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadUsersData() {
    setIsUsersLoading(true);

    try {
      const response = await usersApi.adminUsersList();
      const nextUsers = response.data.data ?? [];
      const resolvedUserId = selectedUserId ?? nextUsers[0]?.id ?? null;
      const resolvedUser =
        nextUsers.find((user) => user.id === resolvedUserId) ?? null;

      setUsers(nextUsers);
      setSelectedUserId(resolvedUserId);
      setSelectedUserRoleIds(
        resolvedUser?.role_ids ??
          resolvedUser?.roles?.map((role) => role.id ?? 0).filter(Boolean) ??
          []
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "获取用户列表失败。"
      );
    } finally {
      setIsUsersLoading(false);
    }
  }

  async function handleSaveUserRoles() {
    if (!selectedUserId) {
      return;
    }

    setIsUserRolesSaving(true);

    try {
      const response = await usersApi.adminUserRolesUpdate({
        id: selectedUserId,
        request: {
          role_ids: selectedUserRoleIds,
        },
      });

      const updatedUser = response.data.data ?? null;

      if (updatedUser) {
        setUsers((current) =>
          current.map((user) =>
            user.id === selectedUserId ? { ...user, ...updatedUser } : user
          )
        );
        setSelectedUserRoleIds(
          updatedUser.role_ids ??
            updatedUser.roles?.map((role) => role.id ?? 0).filter(Boolean) ??
            []
        );
      } else {
        await loadUsersData();
      }

      await refreshSidebarMenus();
      message.success("用户角色分配已更新。");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "保存用户角色失败。"
      );
    } finally {
      setIsUserRolesSaving(false);
    }
  }

  function openCreatePermissionModal() {
    setPermissionModalMode("create");
    setEditingPermissionId(null);
    setPermissionForm(emptyPermissionForm);
    setIsPermissionModalOpen(true);
  }

  function openEditPermissionModal(permission: RbacPermission) {
    setPermissionModalMode("edit");
    setEditingPermissionId(permission.id ?? null);
    setPermissionForm({
      name: permission.name ?? "",
      code: permission.code ?? "",
    });
    setIsPermissionModalOpen(true);
  }

  function closePermissionModal() {
    setIsPermissionModalOpen(false);
    setEditingPermissionId(null);
    setPermissionForm(emptyPermissionForm);
  }

  async function handleSavePermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!permissionForm.name.trim()) {
      message.error("请输入权限名称。");
      return;
    }

    if (!permissionForm.code.trim()) {
      message.error("请输入权限编码。");
      return;
    }

    setIsPermissionSaving(true);

    try {
      const request = {
        name: permissionForm.name.trim(),
        code: permissionForm.code.trim(),
      };

      if (permissionModalMode === "create") {
        await rbacApi.adminPermissionCreate({
          request,
        });
        message.success("权限创建成功。");
      } else {
        if (!editingPermissionId) {
          throw new Error("缺少需要编辑的权限 ID。");
        }

        await rbacApi.adminPermissionUpdate({
          id: editingPermissionId,
          request,
        });
        message.success("权限更新成功。");
      }

      await refreshSidebarMenus();
      await loadRbacData();
      closePermissionModal();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存权限失败。");
    } finally {
      setIsPermissionSaving(false);
    }
  }

  async function handleDeletePermission(permission: RbacPermission) {
    if (!permission.id) {
      return;
    }

    const confirmed = window.confirm(
      `确定删除权限“${permission.name ?? permission.code ?? "未命名权限"}”吗？`
    );

    if (!confirmed) {
      return;
    }

    setDeletingPermissionId(permission.id);

    try {
      await rbacApi.adminPermissionDelete({
        id: permission.id,
      });
      message.success("权限已删除。");
      await refreshSidebarMenus();
      await loadRbacData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "删除权限失败。");
    } finally {
      setDeletingPermissionId(null);
    }
  }

  async function handleSaveRolePermissions() {
    if (!selectedRoleId) {
      return;
    }

    setIsRoleBindingSaving(true);

    try {
      await rbacApi.adminRolePermissionsUpdate({
        id: selectedRoleId,
        request: {
          permission_ids: selectedPermissionIds,
        },
      });

      setRoles((current) =>
        current.map((role) =>
          role.id === selectedRoleId
            ? {
                ...role,
                permission_ids: selectedPermissionIds,
              }
            : role
        )
      );

      await refreshSidebarMenus();
      message.success("角色权限绑定已更新。");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "保存角色权限失败。"
      );
    } finally {
      setIsRoleBindingSaving(false);
    }
  }

  useEffect(() => {
    void Promise.all([loadRbacData(), loadUsersData()]);
    // 页面初始化时加载 RBAC 数据即可。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Tabs defaultValue="roles" className="settings-tabs">
        <section className="settings-shell">
          <Paper className="settings-hero" radius="xl" p="xl">
            <div>
              <Title order={1}>系统设置</Title>
              <Text mt="sm" c="dimmed">
                按角色、权限点和用户三个维度整理访问控制能力；当前已接入角色权限绑定、
                权限点维护、用户列表和用户角色分配。
              </Text>
            </div>

            <Tabs.List className="settings-tab-list">
              <Tabs.Tab value="roles" className="settings-tab">
                角色管理
              </Tabs.Tab>
              <Tabs.Tab value="permissions" className="settings-tab">
                权限点管理
              </Tabs.Tab>
              <Tabs.Tab value="users" className="settings-tab">
                用户管理
              </Tabs.Tab>
            </Tabs.List>
          </Paper>

          <Tabs.Panel value="roles" pt="md">
            <div className="settings-grid">
              <Paper className="settings-panel" radius="xl" p="lg">
                <Group justify="space-between" className="settings-panel-header">
                  <div>
                    <Title order={2}>角色列表</Title>
                    <Text mt={8} c="dimmed">
                      {roles.length} 个角色，可直接切换查看权限绑定情况。
                    </Text>
                  </div>
                  <Button
                    variant="light"
                    onClick={() => void loadRbacData()}
                    loading={isLoading}
                  >
                    刷新
                  </Button>
                </Group>

                {roles.length > 0 ? (
                  <Stack className="settings-role-list" gap="sm">
                    {roles.map((role) => {
                      const isActive = role.id === selectedRoleId;

                      return (
                        <UnstyledButton
                          key={role.id ?? role.code}
                          className={`settings-role-card${
                            isActive ? " is-active" : ""
                          }`}
                          onClick={() => {
                            if (!role.id) {
                              return;
                            }

                            setSelectedRoleId(role.id);
                            void loadRolePermissions(role.id);
                          }}
                        >
                          <Group
                            justify="space-between"
                            className="settings-role-card-head"
                          >
                            <div>
                              <Text fw={700} c="dark.7">
                                {role.name || `角色 ${role.id ?? "-"}`}
                              </Text>
                              <Text c="dimmed" mt={4}>
                                {role.code || "-"}
                              </Text>
                            </div>
                            <Badge variant="light">
                              {role.permission_ids?.length ??
                                (role.id === selectedRoleId
                                  ? selectedPermissionIds.length
                                  : 0)}{" "}
                              项权限
                            </Badge>
                          </Group>

                          <Group gap="md" className="settings-role-card-meta">
                            <Text size="sm" c="dimmed">
                              ID：{role.id ?? "-"}
                            </Text>
                            <Text size="sm" c="dimmed">
                              更新时间：{formatDateTime(role.updated_at)}
                            </Text>
                          </Group>
                        </UnstyledButton>
                      );
                    })}
                  </Stack>
                ) : (
                  <div className="settings-empty-state">
                    <Text c="dimmed">
                      {isLoading ? "角色加载中..." : "当前还没有角色数据。"}
                    </Text>
                  </div>
                )}
              </Paper>

              <Paper className="settings-panel" radius="xl" p="lg">
                <div className="settings-panel-header">
                  <div>
                    <Title order={2}>角色权限分配</Title>
                    <Text mt={8} c="dimmed">
                      选择角色后勾选权限并保存，当前这部分已接入真实接口。
                    </Text>
                  </div>
                </div>

                <Group align="end" className="settings-role-toolbar">
                  <Select
                    className="settings-field"
                    label="角色"
                    placeholder="请选择角色"
                    value={selectedRoleId ? String(selectedRoleId) : null}
                    data={roles.map((role) => ({
                      value: String(role.id ?? ""),
                      label: role.name || role.code || `角色 ${role.id}`,
                    }))}
                    onChange={(value) => {
                      const nextRoleId = Number(value);
                      setSelectedRoleId(nextRoleId);
                      void loadRolePermissions(nextRoleId);
                    }}
                    disabled={roles.length === 0}
                  />

                  <Button
                    onClick={() => void handleSaveRolePermissions()}
                    disabled={!selectedRoleId}
                    loading={isRoleBindingSaving}
                  >
                    {isRoleBindingSaving ? "保存中..." : "保存权限"}
                  </Button>
                </Group>

                {selectedRole ? (
                  <>
                    <Group gap="md" className="settings-role-summary">
                      <Text c="dimmed">
                        角色名称：{selectedRole.name || "-"}
                      </Text>
                      <Text c="dimmed">
                        角色编码：{selectedRole.code || "-"}
                      </Text>
                      <Text c="dimmed">
                        当前已绑定：{selectedPermissionIds.length} 项
                      </Text>
                    </Group>

                    {sortedPermissions.length > 0 ? (
                      <SimpleGrid
                        className="settings-checkbox-grid"
                        cols={{ base: 1, md: 2 }}
                        spacing="sm"
                      >
                        {sortedPermissions.map((permission) => {
                          const permissionId = permission.id ?? 0;
                          const checked =
                            selectedPermissionIds.includes(permissionId);

                          return (
                            <Paper
                              key={permissionId || permission.code}
                              className="settings-checkbox-card"
                              radius="xl"
                              p="md"
                              withBorder
                            >
                              <Checkbox
                                checked={checked}
                                disabled={
                                  !permission.id || isRoleBindingLoading
                                }
                                label={
                                  <Stack gap={2}>
                                    <Text fw={700}>
                                      {permission.name || "未命名权限"}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                      {permission.code || "-"}
                                    </Text>
                                  </Stack>
                                }
                                onChange={(event) => {
                                  if (!permission.id) {
                                    return;
                                  }

                                  const checked =
                                    event.currentTarget.checked;

                                  setSelectedPermissionIds((current) => {
                                    if (checked) {
                                      return [
                                        ...current,
                                        permission.id as number,
                                      ];
                                    }

                                    return current.filter(
                                      (item) => item !== permission.id
                                    );
                                  });
                                }}
                              />
                            </Paper>
                          );
                        })}
                      </SimpleGrid>
                    ) : (
                      <div className="settings-empty-state">
                        <Text c="dimmed">
                          {isLoading
                            ? "权限加载中..."
                            : "请先创建权限，再为角色分配。"}
                        </Text>
                      </div>
                    )}

                    <Paper
                      className="settings-static-note"
                      radius="xl"
                      p="lg"
                      withBorder
                    >
                      <Title order={3}>角色维护</Title>
                      <Text mt="xs" c="dimmed">
                        角色新增、编辑、删除接口当前尚未开放，这里先预留页面位置。
                        后续一旦后端补齐角色 CRUD，就直接放在角色管理 Tab
                        内实现，不放到用户管理中。
                      </Text>
                    </Paper>
                  </>
                ) : (
                  <div className="settings-empty-state">
                    <Text c="dimmed">
                      {isLoading
                        ? "角色加载中..."
                        : "当前没有可分配权限的角色。"}
                    </Text>
                  </div>
                )}
              </Paper>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="permissions" pt="md">
            <div className="settings-grid settings-grid--single">
              <Paper className="settings-panel" radius="xl" p="lg">
                <Group justify="space-between" className="settings-panel-header">
                  <div>
                    <Title order={2}>权限点列表</Title>
                    <Text mt={8} c="dimmed">
                      {sortedPermissions.length} 条权限点配置，支持新增、编辑和删除。
                    </Text>
                  </div>
                  <Group gap="xs" className="settings-panel-actions">
                    <Button
                      variant="light"
                      onClick={() => void loadRbacData()}
                      loading={isLoading}
                    >
                      刷新
                    </Button>
                    <Button onClick={openCreatePermissionModal}>
                      新增权限点
                    </Button>
                  </Group>
                </Group>

                {sortedPermissions.length > 0 ? (
                  <Table.ScrollContainer
                    minWidth={860}
                    className="settings-table-wrapper"
                  >
                    <Table
                      className="settings-table settings-permissions-table"
                      highlightOnHover
                      withTableBorder
                    >
                      <thead>
                        <tr>
                          <th scope="col">权限名称</th>
                          <th scope="col">权限编码</th>
                          <th scope="col">ID</th>
                          <th scope="col">更新时间</th>
                          <th scope="col">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPermissions.map((permission) => (
                          <tr key={permission.id ?? permission.code}>
                            <td>
                              <Text fw={700} c="dark.7">
                                {permission.name || "未命名权限"}
                              </Text>
                            </td>
                            <td>
                              <Text c="dimmed">{permission.code || "-"}</Text>
                            </td>
                            <td>
                              <Text>{permission.id ?? "-"}</Text>
                            </td>
                            <td>
                              <Text>{formatDateTime(permission.updated_at)}</Text>
                            </td>
                            <td>
                              <Group
                                gap="xs"
                                className="settings-permission-actions"
                              >
                                <Button
                                  variant="light"
                                  onClick={() =>
                                    openEditPermissionModal(permission)
                                  }
                                >
                                  编辑
                                </Button>
                                <Button
                                  color="red"
                                  variant="light"
                                  onClick={() =>
                                    void handleDeletePermission(permission)
                                  }
                                  loading={deletingPermissionId === permission.id}
                                >
                                  删除
                                </Button>
                              </Group>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Table.ScrollContainer>
                ) : (
                  <div className="settings-empty-state">
                    <Text c="dimmed">
                      {isLoading ? "权限加载中..." : "当前还没有权限点配置。"}
                    </Text>
                  </div>
                )}
              </Paper>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="users" pt="md">
            <div className="settings-grid">
              <Paper className="settings-panel" radius="xl" p="lg">
                <Group justify="space-between" className="settings-panel-header">
                  <div>
                    <Title order={2}>用户列表</Title>
                    <Text mt={8} c="dimmed">
                      {sortedUsers.length} 个用户，可切换查看并分配角色。
                    </Text>
                  </div>
                  <Button
                    variant="light"
                    onClick={() => void loadUsersData()}
                    loading={isUsersLoading}
                  >
                    刷新
                  </Button>
                </Group>

                {sortedUsers.length > 0 ? (
                  <Stack className="settings-user-list" gap="sm">
                    {sortedUsers.map((user) => {
                      const isActive = user.id === selectedUserId;

                      return (
                        <UnstyledButton
                          key={user.id ?? user.username}
                          className={`settings-user-card${
                            isActive ? " is-active" : ""
                          }`}
                          onClick={() => {
                            setSelectedUserId(user.id ?? null);
                            setSelectedUserRoleIds(
                              user.role_ids ??
                                user.roles
                                  ?.map((role) => role.id ?? 0)
                                  .filter(Boolean) ??
                                []
                            );
                          }}
                        >
                          <Group justify="space-between" align="flex-start">
                            <div>
                              <Text fw={700}>
                                {user.nickname || user.username || "未命名用户"}
                              </Text>
                              <Text mt={4} c="dimmed">
                                {user.username || "-"}
                              </Text>
                            </div>
                            <Badge
                              variant="light"
                              color={user.status === "active" ? "blue" : "gray"}
                            >
                              {user.status || "未知状态"}
                            </Badge>
                          </Group>

                          <Group gap="xs" className="settings-user-role-tags">
                            {(user.roles ?? []).length > 0 ? (
                              (user.roles ?? []).map((role) => (
                                <Badge
                                  key={`${user.id}-${role.id ?? role.code}`}
                                  variant="light"
                                >
                                  {role.name || role.code || "未命名角色"}
                                </Badge>
                              ))
                            ) : (
                              <Text size="sm" c="dimmed">
                                暂未绑定角色
                              </Text>
                            )}
                          </Group>

                          <Group gap="md" className="settings-role-card-meta">
                            <Text size="sm" c="dimmed">
                              用户 ID：{user.id ?? "-"}
                            </Text>
                            <Text size="sm" c="dimmed">
                              更新时间：{formatDateTime(user.updated_at)}
                            </Text>
                          </Group>
                        </UnstyledButton>
                      );
                    })}
                  </Stack>
                ) : (
                  <div className="settings-empty-state">
                    <Text c="dimmed">
                      {isUsersLoading
                        ? "用户加载中..."
                        : "当前还没有用户数据。"}
                    </Text>
                  </div>
                )}
              </Paper>

              <Paper className="settings-panel" radius="xl" p="lg">
                <div className="settings-panel-header">
                  <div>
                    <Title order={2}>用户角色分配</Title>
                    <Text mt={8} c="dimmed">
                      选中用户后勾选角色并保存，这部分已接入真实接口。
                    </Text>
                  </div>
                </div>

                {selectedUser ? (
                  <>
                    <Group gap="md" className="settings-role-summary">
                      <Text c="dimmed">
                        用户名称：
                        {selectedUser.nickname ||
                          selectedUser.username ||
                          "未命名用户"}
                      </Text>
                      <Text c="dimmed">
                        用户账号：{selectedUser.username || "-"}
                      </Text>
                      <Text c="dimmed">
                        当前已绑定：{selectedUserRoleIds.length} 个角色
                      </Text>
                    </Group>

                    {roles.length > 0 ? (
                      <>
                        <div className="settings-role-option-list">
                          {roles.map((role) => {
                            const roleId = role.id ?? 0;
                            const checked =
                              roleId > 0 &&
                              selectedUserRoleIds.includes(roleId);

                            return (
                              <Paper
                                key={roleId || role.code}
                                className="settings-role-option"
                                radius="xl"
                                p="md"
                                withBorder
                              >
                                <Checkbox
                                  checked={checked}
                                  disabled={!role.id}
                                  label={
                                    <Stack gap={2}>
                                      <Text fw={700}>
                                        {role.name || "未命名角色"}
                                      </Text>
                                      <Text size="sm" c="dimmed">
                                        {role.code || "-"}
                                      </Text>
                                    </Stack>
                                  }
                                  onChange={(event) => {
                                    if (!role.id) {
                                      return;
                                    }

                                    const checked =
                                      event.currentTarget.checked;

                                    setSelectedUserRoleIds((current) => {
                                      if (checked) {
                                        return [...current, role.id as number];
                                      }

                                      return current.filter(
                                        (item) => item !== role.id
                                      );
                                    });
                                  }}
                                />
                              </Paper>
                            );
                          })}
                        </div>

                        <Group
                          justify="flex-end"
                          className="settings-form-actions"
                        >
                          <Button
                            onClick={() => void handleSaveUserRoles()}
                            disabled={!selectedUserId}
                            loading={isUserRolesSaving}
                          >
                            {isUserRolesSaving ? "保存中..." : "保存用户角色"}
                          </Button>
                        </Group>
                      </>
                    ) : (
                      <div className="settings-empty-state">
                        <Text c="dimmed">
                          {isLoading ? "角色加载中..." : "当前还没有角色数据。"}
                        </Text>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="settings-empty-state">
                    <Text c="dimmed">
                      {isUsersLoading
                        ? "用户加载中..."
                        : "当前没有可分配角色的用户。"}
                    </Text>
                  </div>
                )}
              </Paper>
            </div>
          </Tabs.Panel>
        </section>
      </Tabs>

      <Modal
        opened={isPermissionModalOpen}
        onClose={closePermissionModal}
        title={permissionModalMode === "create" ? "新增权限" : "编辑权限"}
        centered
        radius="md"
      >
        <Text c="dimmed" mb="md">
          权限编码建议与菜单权限码保持一致，便于角色授权和菜单可见性联动。
        </Text>

        <form className="settings-form" onSubmit={handleSavePermission}>
          <Stack gap="md">
            <TextInput
              label="权限名称"
              value={permissionForm.name}
              onChange={(event) =>
                updatePermissionField("name", event.currentTarget.value)
              }
              placeholder="例如：计划管理查看"
              required
            />

            <TextInput
              label="权限编码"
              value={permissionForm.code}
              onChange={(event) =>
                updatePermissionField("code", event.currentTarget.value)
              }
              placeholder="例如：plans:list"
              required
            />

            <Group justify="flex-end" className="settings-form-actions">
              <Button
                variant="light"
                color="gray"
                onClick={closePermissionModal}
              >
                取消
              </Button>
              <Button type="submit" loading={isPermissionSaving}>
                {isPermissionSaving
                  ? "保存中..."
                  : permissionModalMode === "create"
                  ? "创建权限"
                  : "保存修改"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
