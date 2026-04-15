import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import type {
  GoalGoal,
  PlanPhase,
  TaskCreateTaskRequest,
  TaskTask,
  TaskTaskPriority,
  TaskTaskStatus,
  TaskUpdateTaskRequest,
} from '../../common/api'
import {
  goalsApi,
  plansApi,
  tasksApi,
  TaskTaskPriority as TaskPriorityEnum,
  TaskTaskStatus as TaskStatusEnum,
} from '../../common/api'
import { ConfirmActionModal } from '../../common/components/ConfirmActionModal'
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
  deadline: string
  estimated_days: string
  plan_goal_id: string
  priority: '' | TaskTaskPriority
  sort_order: string
  phase_id: string
}

const TASKS_PAGE_SIZE = 10

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
  deadline: '',
  estimated_days: '',
  plan_goal_id: '',
  priority: '',
  sort_order: '',
  phase_id: '',
}

function buildPhaseOptions(phases: PlanPhase[]) {
  return phases
    .filter((phase) => phase.id)
    .map((phase) => ({
      value: String(phase.id),
      label:
        phase.title?.trim() ||
        (phase.sort_order ? `阶段 ${phase.sort_order}` : `阶段 ${phase.id}`),
    }))
}

function getTaskPriorityLabel(priority?: TaskTaskPriority | null) {
  if (!priority) {
    return '-'
  }

  return taskPriorityOptions.find((item) => item.value === priority)?.label ?? priority
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return ''
  }

  const normalized = value.trim()

  if (!normalized) {
    return ''
  }

  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) {
    return normalized.slice(0, 16)
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 16)
}

function toRfc3339Value(value: string) {
  if (!value.trim()) {
    return undefined
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString()
}

export function TasksPage() {
  const [goals, setGoals] = useState<GoalGoal[]>([])
  const [tasks, setTasks] = useState<TaskTask[]>([])
  const [taskPage, setTaskPage] = useState(1)
  const [taskTotal, setTaskTotal] = useState(0)
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
  const [taskToDelete, setTaskToDelete] = useState<TaskTask | null>(null)
  const [phaseOptionsByGoal, setPhaseOptionsByGoal] = useState<Record<string, { value: string; label: string }[]>>({})
  const [isPhaseOptionsLoading, setIsPhaseOptionsLoading] = useState(false)
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
    const defaultPlanGoalId = filter.goalId || ''

    setTaskModalMode('create')
    setEditingTaskId(null)
    setTaskForm({
      ...emptyTaskForm,
      plan_goal_id: defaultPlanGoalId,
    })
    setIsTaskModalOpen(true)

    if (defaultPlanGoalId) {
      void ensurePhaseOptionsLoaded(defaultPlanGoalId)
    }
  }

  function openEditTaskModal(task: TaskTask) {
    const planGoalId = task.goal_id ? String(task.goal_id) : ''

    setTaskModalMode('edit')
    setEditingTaskId(task.id ?? null)
    setTaskForm({
      title: task.title ?? '',
      description: task.description ?? '',
      deliverables: task.deliverables ?? '',
      deadline: toDateTimeLocalValue(task.deadline),
      estimated_days: task.estimated_days ? String(task.estimated_days) : '',
      plan_goal_id: planGoalId,
      priority: task.priority ?? '',
      sort_order: task.sort_order ? String(task.sort_order) : '',
      phase_id: task.phase_id ? String(task.phase_id) : '',
    })
    setIsTaskModalOpen(true)

    if (planGoalId) {
      void ensurePhaseOptionsLoaded(planGoalId)
    }
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

  async function ensurePhaseOptionsLoaded(goalId: string) {
    if (!goalId || phaseOptionsByGoal[goalId]) {
      return
    }

    setIsPhaseOptionsLoading(true)

    try {
      const response = await plansApi.goalPlanGet({
        id: Number(goalId),
      })

      const phaseOptions = buildPhaseOptions(response.data.data?.phases ?? [])

      setPhaseOptionsByGoal((current) => ({
        ...current,
        [goalId]: phaseOptions,
      }))
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取计划阶段失败。')
    } finally {
      setIsPhaseOptionsLoading(false)
    }
  }

  async function loadTasks(nextFilter = filter, page = taskPage) {
    setIsLoading(true)

    try {
      const response = await tasksApi.tasksList({
        goalId: nextFilter.goalId ? Number(nextFilter.goalId) : undefined,
        status: nextFilter.status || undefined,
        page,
        pageSize: TASKS_PAGE_SIZE,
      })

      const nextData = response.data.data

      setTasks(nextData?.list ?? [])
      setTaskPage(nextData?.page ?? page)
      setTaskTotal(nextData?.total ?? nextData?.list?.length ?? 0)
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

    if (!taskForm.plan_goal_id) {
      message.error('请选择所属计划。')
      return
    }

    if (!taskForm.phase_id) {
      message.error('请选择所属阶段。')
      return
    }

    const request: TaskCreateTaskRequest | TaskUpdateTaskRequest = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || undefined,
      deliverables: taskForm.deliverables.trim() || undefined,
      deadline: toRfc3339Value(taskForm.deadline),
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

      await loadTasks(filter, 1)
      closeTaskModal()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存任务失败。')
    } finally {
      setIsTaskSaving(false)
    }
  }

  async function handleDeleteTask() {
    if (!taskToDelete?.id) {
      return
    }

    setDeletingTaskId(taskToDelete.id)

    try {
      await tasksApi.taskDelete({
        id: taskToDelete.id,
      })
      message.success('任务已删除。')
      setTaskToDelete(null)
      const nextPage = tasks.length === 1 && taskPage > 1 ? taskPage - 1 : taskPage
      await loadTasks(filter, nextPage)
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

    return `共 ${taskTotal} 条任务`
  }, [isLoading, taskTotal])

  const planOptions = useMemo(
    () =>
      goals
        .filter((goal) => goal.id)
        .map((goal) => ({
          value: String(goal.id),
          label: goal.title || '未命名计划',
        })),
    [goals],
  )

  const currentPhaseOptions = useMemo(
    () => phaseOptionsByGoal[taskForm.plan_goal_id] ?? [],
    [phaseOptionsByGoal, taskForm.plan_goal_id],
  )

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
                void loadTasks(nextFilter, 1)
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
                void loadTasks(nextFilter, 1)
              }}
            />

            <Button
              className="tasks-refresh-button"
              onClick={() => void loadTasks(filter, taskPage)}
              loading={isLoading}
              mt={24}
            >
              刷新
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
                  <th scope="col">截止时间</th>
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
                    <td><Text>{formatDateTime(task.deadline)}</Text></td>
                    <td><Text>{task.estimated_days ?? 0} 天</Text></td>
                    <td><Text>{formatDateTime(task.updated_at)}</Text></td>
                    <td>
                      <div className="tasks-actions-cell">
                        <Select
                          className="tasks-status-select"
                          aria-label="修改任务状态"
                          value={task.status ?? TaskStatusEnum.TaskStatusTodo}
                          data={taskStatusOptions.map((status) => ({
                            value: status.value,
                            label: status.label,
                          }))}
                          allowDeselect={false}
                          disabled={!task.id || updatingTaskId === task.id}
                          onChange={(value) => {
                            if (!task.id || !value || value === task.status) {
                              return
                            }

                            void handleUpdateTaskStatus(task.id, value as TaskTaskStatus)
                          }}
                        />

                        <Group gap="xs" className="tasks-row-secondary-actions">
                          <Button
                            className="tasks-row-edit-button"
                            variant="light"
                            color="blue"
                            size="xs"
                            leftSection={<IconPencil size={14} stroke={1.9} />}
                            onClick={() => openEditTaskModal(task)}
                            disabled={!task.id}
                          >
                            编辑
                          </Button>
                          <ActionIcon
                            className="tasks-row-delete-button"
                            variant="light"
                            color="red"
                            size="lg"
                            onClick={() => setTaskToDelete(task)}
                            loading={deletingTaskId === task.id}
                            disabled={!task.id}
                            aria-label={`删除任务${task.title ?? ''}`}
                          >
                            <IconTrash size={16} stroke={1.9} />
                          </ActionIcon>
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

        {taskTotal > TASKS_PAGE_SIZE ? (
          <Pagination
            className="tasks-pagination"
            total={Math.ceil(taskTotal / TASKS_PAGE_SIZE)}
            value={taskPage}
            onChange={(page) => void loadTasks(filter, page)}
            disabled={isLoading}
            siblings={1}
            boundaries={1}
          />
        ) : null}
      </Paper>

      <Modal
        opened={isTaskModalOpen}
        onClose={closeTaskModal}
        title={taskModalMode === 'create' ? '新增任务' : '编辑任务'}
        centered
        radius="md"
        size={920}
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
              label="预期产出"
              minRows={3}
              value={taskForm.deliverables}
              onChange={(event) => updateTaskField('deliverables', event.currentTarget.value)}
              placeholder="请输入这项任务完成后要产出的结果"
            />

            <div className="tasks-form-grid">
              <Select
                label="所属计划"
                placeholder="请选择计划"
                value={taskForm.plan_goal_id || null}
                data={planOptions}
                searchable
                onChange={(value) => {
                  const nextPlanGoalId = value ?? ''
                  updateTaskField('plan_goal_id', nextPlanGoalId)
                  updateTaskField('phase_id', '')

                  if (nextPlanGoalId) {
                    void ensurePhaseOptionsLoaded(nextPlanGoalId)
                  }
                }}
              />

              <Select
                label="所属阶段"
                placeholder={
                  taskForm.plan_goal_id
                    ? currentPhaseOptions.length > 0
                      ? '请选择阶段'
                      : '当前计划暂无阶段'
                    : '请先选择计划'
                }
                value={taskForm.phase_id || null}
                data={currentPhaseOptions}
                searchable
                disabled={!taskForm.plan_goal_id || currentPhaseOptions.length === 0}
                rightSection={isPhaseOptionsLoading ? <Text size="xs" c="dimmed">加载中</Text> : undefined}
                onChange={(value) => updateTaskField('phase_id', value ?? '')}
              />
            </div>

            <Text size="sm" c="dimmed">
              任务会归属到所选计划下的具体阶段，保存时系统会根据阶段自动关联对应计划。
            </Text>

            <div className="tasks-form-grid">
              <TextInput
                label="任务截止时间"
                type="datetime-local"
                value={taskForm.deadline}
                onChange={(event) => updateTaskField('deadline', event.currentTarget.value)}
                placeholder="请选择截止时间"
              />

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

      <ConfirmActionModal
        opened={Boolean(taskToDelete)}
        onClose={() => {
          if (!deletingTaskId) {
            setTaskToDelete(null)
          }
        }}
        onConfirm={() => void handleDeleteTask()}
        title="删除任务"
        content={`删除任务“${taskToDelete?.title ?? '未命名任务'}”后将无法恢复，是否删除？`}
        confirmLabel="删除任务"
        confirmColor="red"
        loading={Boolean(deletingTaskId)}
      />
    </section>
  )
}
