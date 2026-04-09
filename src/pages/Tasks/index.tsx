import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import type {
  GoalGoal,
  TaskCreateTaskRequest,
  TaskTask,
  TaskTaskPriority,
  TaskTaskStatus,
  TaskUpdateTaskRequest,
} from '../../common/api'
import {
  goalsApi,
  tasksApi,
  TaskTaskPriority as TaskPriorityEnum,
  TaskTaskStatus as TaskStatusEnum,
} from '../../common/api'
import { useAppMessage } from '../../common/message/AppMessageProvider'
import { getTaskStatusLabel, taskStatusOptions } from '../../common/dicts'
import { formatDateTime } from '../../common/utils/date'
import './index.css'

type TaskFilterState = {
  goalId: string
  status: '' | TaskTaskStatus
}

type TaskModalMode = 'create' | 'edit'

type TaskFormState = {
  title: string
  description: string
  deliverables: string
  estimated_days: string
  priority: '' | TaskTaskPriority
  sort_order: string
  phase_id: string
}

const taskBoardColumns: TaskTaskStatus[] = [
  TaskStatusEnum.TaskStatusTodo,
  TaskStatusEnum.TaskStatusInProgress,
  TaskStatusEnum.TaskStatusDone,
]

const taskPriorityOptions = [
  {
    value: TaskPriorityEnum.TaskPriorityHigh,
    label: '高',
  },
  {
    value: TaskPriorityEnum.TaskPriorityMedium,
    label: '中',
  },
  {
    value: TaskPriorityEnum.TaskPriorityLow,
    label: '低',
  },
]

const emptyTaskForm: TaskFormState = {
  title: '',
  description: '',
  deliverables: '',
  estimated_days: '',
  priority: '',
  sort_order: '',
  phase_id: '',
}

function getTaskPriorityLabel(priority?: TaskTaskPriority | null) {
  if (!priority) {
    return '-'
  }

  return taskPriorityOptions.find((item) => item.value === priority)?.label ?? priority
}

export function TasksPage() {
  const [goals, setGoals] = useState<GoalGoal[]>([])
  const [tasks, setTasks] = useState<TaskTask[]>([])
  const [filter, setFilter] = useState<TaskFilterState>({
    goalId: '',
    status: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskModalMode, setTaskModalMode] = useState<TaskModalMode>('create')
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [taskForm, setTaskForm] = useState<TaskFormState>(emptyTaskForm)
  const [isTaskSaving, setIsTaskSaving] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null)
  const message = useAppMessage()

  function updateTaskField<Key extends keyof TaskFormState>(
    key: Key,
    value: TaskFormState[Key],
  ) {
    setTaskForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function openCreateTaskModal() {
    setTaskModalMode('create')
    setEditingTaskId(null)
    setTaskForm(emptyTaskForm)
    setIsTaskModalOpen(true)
  }

  function openEditTaskModal(task: TaskTask) {
    setTaskModalMode('edit')
    setEditingTaskId(task.id ?? null)
    setTaskForm({
      title: task.title ?? '',
      description: task.description ?? '',
      deliverables: task.deliverables ?? '',
      estimated_days: task.estimated_days ? String(task.estimated_days) : '',
      priority: task.priority ?? '',
      sort_order: task.sort_order ? String(task.sort_order) : '',
      phase_id: task.phase_id ? String(task.phase_id) : '',
    })
    setIsTaskModalOpen(true)
  }

  function closeTaskModal() {
    setIsTaskModalOpen(false)
    setEditingTaskId(null)
    setTaskForm(emptyTaskForm)
  }

  async function loadGoals() {
    try {
      const response = await goalsApi.goalsList()
      setGoals(response.data.data?.list ?? [])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取目标筛选项失败。')
    }
  }

  async function loadTasks(nextFilter = filter) {
    setIsLoading(true)

    try {
      const response = await tasksApi.tasksList({
        goalId: nextFilter.goalId ? Number(nextFilter.goalId) : undefined,
        status: nextFilter.status || undefined,
      })

      setTasks(response.data.data?.list ?? [])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取任务列表失败。')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpdateTaskStatus(taskId: number, status: TaskTaskStatus) {
    setUpdatingTaskId(taskId)

    try {
      const response = await tasksApi.taskUpdateStatus({
        id: taskId,
        request: {
          status,
        },
      })

      const updatedTask = response.data.data ?? null

      if (updatedTask) {
        setTasks((current) =>
          current.map((task) => (task.id === updatedTask.id ? { ...task, ...updatedTask } : task)),
        )
      } else {
        await loadTasks()
      }

      message.success('任务状态已更新。')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更新任务状态失败。')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  async function handleSaveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!taskForm.title.trim()) {
      message.error('请输入任务标题。')
      return
    }

    const request: TaskCreateTaskRequest | TaskUpdateTaskRequest = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || undefined,
      deliverables: taskForm.deliverables.trim() || undefined,
      estimated_days: taskForm.estimated_days ? Number(taskForm.estimated_days) : undefined,
      priority: taskForm.priority || undefined,
      sort_order: taskForm.sort_order ? Number(taskForm.sort_order) : undefined,
      phase_id: taskForm.phase_id ? Number(taskForm.phase_id) : undefined,
    }

    setIsTaskSaving(true)

    try {
      if (taskModalMode === 'create') {
        await tasksApi.taskCreate({
          request,
        })
        message.success('任务创建成功。')
      } else {
        if (!editingTaskId) {
          throw new Error('缺少需要编辑的任务 ID。')
        }

        await tasksApi.taskUpdate({
          id: editingTaskId,
          request,
        })
        message.success('任务更新成功。')
      }

      await loadTasks()
      closeTaskModal()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存任务失败。')
    } finally {
      setIsTaskSaving(false)
    }
  }

  async function handleDeleteTask(task: TaskTask) {
    if (!task.id) {
      return
    }

    const confirmed = window.confirm(`确定删除任务“${task.title ?? '未命名任务'}”吗？`)

    if (!confirmed) {
      return
    }

    setDeletingTaskId(task.id)

    try {
      await tasksApi.taskDelete({
        id: task.id,
      })
      message.success('任务已删除。')
      await loadTasks()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除任务失败。')
    } finally {
      setDeletingTaskId(null)
    }
  }

  useEffect(() => {
    void Promise.all([loadGoals(), loadTasks()])
    // 首次进入任务看板时初始化即可。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const taskCountLabel = useMemo(() => {
    if (isLoading) {
      return '任务加载中...'
    }

    return `共 ${tasks.length} 条任务`
  }, [isLoading, tasks.length])

  return (
    <section className="tasks-shell">
      <Paper className="tasks-hero" radius="xl" p="xl">
        <Title order={1}>任务看板</Title>
        <Text mt="sm" c="dimmed">
          用表格统一查看任务信息，上方筛选后即可快速定位，再直接在行内更新任务状态。
        </Text>
      </Paper>

      <Paper className="tasks-panel" radius="xl" p="lg">
        <div className="tasks-panel-header">
          <div>
            <Title order={2}>任务列表</Title>
            <Text mt={8} c="dimmed">{taskCountLabel}</Text>
          </div>

          <div className="tasks-filters">
            <Button
              className="tasks-create-button"
              onClick={openCreateTaskModal}
            >
              新增任务
            </Button>

            <Select
              className="tasks-filter-field"
              label="目标"
              placeholder="全部目标"
              value={filter.goalId || null}
              clearable
              data={goals.map((goal) => ({
                value: String(goal.id ?? ''),
                label: goal.title || '未命名目标',
              }))}
              onChange={(value) => {
                const nextFilter = {
                  ...filter,
                  goalId: value ?? '',
                }
                setFilter(nextFilter)
                void loadTasks(nextFilter)
              }}
            />

            <Select
              className="tasks-filter-field"
              label="状态"
              placeholder="全部状态"
              value={filter.status || null}
              clearable
              data={taskStatusOptions.map((status) => ({
                value: status.value,
                label: status.label,
              }))}
              onChange={(value) => {
                const nextFilter = {
                  ...filter,
                  status: (value ?? '') as TaskFilterState['status'],
                }
                setFilter(nextFilter)
                void loadTasks(nextFilter)
              }}
            />

            <Button
              className="tasks-refresh-button"
              onClick={() => void loadTasks()}
              loading={isLoading}
              mt={24}
            >
              {isLoading ? '刷新中...' : '刷新'}
            </Button>
          </div>
        </div>

        {tasks.length > 0 ? (
          <Table.ScrollContainer minWidth={980} className="tasks-table-wrapper">
            <Table className="tasks-table" highlightOnHover withTableBorder withColumnBorders={false}>
              <thead>
                <tr>
                  <th scope="col">任务</th>
                  <th scope="col">目标</th>
                  <th scope="col">阶段</th>
                  <th scope="col">状态</th>
                  <th scope="col">优先级</th>
                  <th scope="col">预计天数</th>
                  <th scope="col">更新时间</th>
                  <th scope="col">操作</th>
                </tr>
              </thead>

              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id ?? `${task.goal_id}-${task.title}`}>
                    <td className="tasks-primary-cell">
                      <Text fw={700} c="dark.7">{task.title || '未命名任务'}</Text>
                      <Text c="dimmed" mt={8}>{task.description || task.deliverables || '暂未填写任务说明。'}</Text>
                    </td>

                    <td><Text>{task.goal_title || '-'}</Text></td>
                    <td><Text>{task.phase_title || '-'}</Text></td>
                    <td>
                      <Badge className={`tasks-status-chip is-${task.status ?? 'todo'}`} variant="light">
                        {getTaskStatusLabel(task.status)}
                      </Badge>
                    </td>
                    <td><Text>{getTaskPriorityLabel(task.priority)}</Text></td>
                    <td><Text>{task.estimated_days ?? 0} 天</Text></td>
                    <td><Text>{formatDateTime(task.updated_at)}</Text></td>
                    <td>
                      <div className="tasks-actions-cell">
                        <Group gap="xs" className="tasks-row-actions">
                          {taskBoardColumns.map((nextStatus) => (
                            <Button
                              key={nextStatus}
                              className={`tasks-action-button${
                                nextStatus === task.status ? ' is-current' : ''
                              }`}
                              variant={nextStatus === task.status ? 'filled' : 'light'}
                              color={nextStatus === task.status ? 'blue' : 'gray'}
                              size="xs"
                              onClick={() => {
                                if (!task.id || nextStatus === task.status) {
                                  return
                                }

                                void handleUpdateTaskStatus(task.id, nextStatus)
                              }}
                              disabled={
                                !task.id ||
                                updatingTaskId === task.id ||
                                nextStatus === task.status
                              }
                            >
                              {updatingTaskId === task.id && nextStatus !== task.status
                                ? '更新中...'
                                : getTaskStatusLabel(nextStatus)}
                            </Button>
                          ))}
                        </Group>

                        <Group gap="xs" className="tasks-row-secondary-actions">
                          <Button
                            variant="light"
                            color="gray"
                            size="xs"
                            onClick={() => openEditTaskModal(task)}
                            disabled={!task.id}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="light"
                            color="red"
                            size="xs"
                            onClick={() => void handleDeleteTask(task)}
                            loading={deletingTaskId === task.id}
                            disabled={!task.id}
                          >
                            {deletingTaskId === task.id ? '删除中...' : '删除'}
                          </Button>
                        </Group>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Table.ScrollContainer>
        ) : (
          <div className="tasks-empty-state">
            <Text c="dimmed">{isLoading ? '任务加载中...' : '当前筛选条件下没有任务。'}</Text>
          </div>
        )}
      </Paper>

      <Modal
        opened={isTaskModalOpen}
        onClose={closeTaskModal}
        title={taskModalMode === 'create' ? '新增任务' : '编辑任务'}
        centered
        radius="xl"
      >
        <form className="tasks-form" onSubmit={handleSaveTask}>
          <Stack gap="md">
            <TextInput
              label="任务标题"
              value={taskForm.title}
              onChange={(event) => updateTaskField('title', event.currentTarget.value)}
              placeholder="请输入任务标题"
              required
            />

            <Textarea
              label="任务描述"
              minRows={4}
              value={taskForm.description}
              onChange={(event) => updateTaskField('description', event.currentTarget.value)}
              placeholder="请输入任务描述"
            />

            <Textarea
              label="交付物"
              minRows={3}
              value={taskForm.deliverables}
              onChange={(event) => updateTaskField('deliverables', event.currentTarget.value)}
              placeholder="请输入交付物说明"
            />

            <div className="tasks-form-grid">
              <TextInput
                label="预计天数"
                value={taskForm.estimated_days}
                onChange={(event) => updateTaskField('estimated_days', event.currentTarget.value)}
                placeholder="例如：3"
              />

              <Select
                label="优先级"
                placeholder="请选择优先级"
                value={taskForm.priority || null}
                data={taskPriorityOptions}
                clearable
                onChange={(value) => updateTaskField('priority', (value ?? '') as TaskFormState['priority'])}
              />

              <TextInput
                label="排序值"
                value={taskForm.sort_order}
                onChange={(event) => updateTaskField('sort_order', event.currentTarget.value)}
                placeholder="例如：1"
              />

              <TextInput
                label="阶段 ID"
                value={taskForm.phase_id}
                onChange={(event) => updateTaskField('phase_id', event.currentTarget.value)}
                placeholder="可选，请输入阶段 ID"
              />
            </div>

            <Group justify="flex-end" className="tasks-form-actions">
              <Button variant="light" color="gray" onClick={closeTaskModal}>
                取消
              </Button>
              <Button type="submit" loading={isTaskSaving}>
                {isTaskSaving
                  ? '保存中...'
                  : taskModalMode === 'create'
                    ? '创建任务'
                    : '保存修改'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </section>
  )
}
