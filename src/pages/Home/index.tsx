import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import type { GoalGoal, TaskTask } from '../../common/api'
import { GoalGoalStatus, goalsApi, tasksApi } from '../../common/api'
import { useAppMessage } from '../../common/message/AppMessageProvider'
import { getGoalDisplayStatus, getGoalStatusLabel, getTaskStatusLabel } from '../../common/dicts'
import { formatDateTime } from '../../common/utils/date'
import './index.css'

type DashboardStats = {
  totalGoals: number
  activeGoals: number
  completedGoals: number
  totalTasks: number
  doneTasks: number
  inProgressTasks: number
  todoTasks: number
}

function sortTasksByUpdatedAt(tasks: TaskTask[]) {
  return [...tasks].sort((left, right) => {
    const leftTime = new Date(left.updated_at ?? left.created_at ?? 0).getTime()
    const rightTime = new Date(right.updated_at ?? right.created_at ?? 0).getTime()
    return rightTime - leftTime
  })
}

function getGoalStatusBadgeClass(status?: GoalGoal['status'] | null) {
  switch (status) {
    case GoalGoalStatus.GoalStatusActive:
      return 'is-in_progress'
    case GoalGoalStatus.GoalStatusCompleted:
    case GoalGoalStatus.GoalStatusArchived:
      return 'is-done'
    case GoalGoalStatus.GoalStatusDraft:
    default:
      return 'is-todo'
  }
}

export function HomePage() {
  const [goals, setGoals] = useState<GoalGoal[]>([])
  const [tasks, setTasks] = useState<TaskTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const message = useAppMessage()

  async function loadDashboardData() {
    setIsLoading(true)

    try {
      const [goalsResponse, tasksResponse] = await Promise.all([
        goalsApi.goalsList(),
        tasksApi.tasksList(),
      ])

      setGoals(goalsResponse.data.data?.list ?? [])
      setTasks(tasksResponse.data.data?.list ?? [])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取仪表盘数据失败。')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboardData()
    // 进入工作台时初始化统计数据即可。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = useMemo<DashboardStats>(() => {
    const totalGoals = goals.length
    const activeGoals = goals.filter((goal) => getGoalDisplayStatus(goal) === 'active').length
    const completedGoals = goals.filter((goal) => getGoalDisplayStatus(goal) === 'completed').length
    const totalTasks = tasks.length
    const doneTasks = tasks.filter((task) => task.status === 'done').length
    const inProgressTasks = tasks.filter((task) => task.status === 'in_progress').length
    const todoTasks = tasks.filter((task) => task.status === 'todo').length

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      totalTasks,
      doneTasks,
      inProgressTasks,
      todoTasks,
    }
  }, [goals, tasks])

  const completionRate =
    stats.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0
  const recentTodoTasks = sortTasksByUpdatedAt(tasks)
    .filter((task) => task.status !== 'done')
    .slice(0, 6)
  const recentGoals = [...goals]
    .sort((left, right) => {
      const leftTime = new Date(left.updated_at ?? left.created_at ?? 0).getTime()
      const rightTime = new Date(right.updated_at ?? right.created_at ?? 0).getTime()
      return rightTime - leftTime
    })
    .slice(0, 5)

  return (
    <section className="home-shell">
      <Paper className="dashboard-hero" radius="xl" p="xl">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1}>仪表盘</Title>
            <Text mt="sm" c="dimmed">
              聚合查看目标推进、任务执行和最近待办，快速掌握当前整体进展。
            </Text>
          </div>
          <Button
            radius="md"
          onClick={() => void loadDashboardData()}
            loading={isLoading}
          >
            {isLoading ? '刷新中...' : '刷新数据'}
          </Button>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="md">
        <Card className="dashboard-stat-card" radius="xl" withBorder>
          <Text size="sm" fw={700} c="dimmed">目标总数</Text>
          <Title order={2}>{stats.totalGoals}</Title>
          <Text c="dimmed">执行中的目标 {stats.activeGoals} 个</Text>
        </Card>
        <Card className="dashboard-stat-card" radius="xl" withBorder>
          <Text size="sm" fw={700} c="dimmed">任务完成率</Text>
          <Title order={2}>{completionRate}%</Title>
          <Text c="dimmed">
            已完成 {stats.doneTasks} / {stats.totalTasks || 0}
          </Text>
        </Card>
        <Card className="dashboard-stat-card" radius="xl" withBorder>
          <Text size="sm" fw={700} c="dimmed">当前计划统计</Text>
          <Title order={2}>{stats.inProgressTasks}</Title>
          <Text c="dimmed">进行中的任务数</Text>
        </Card>
        <Card className="dashboard-stat-card" radius="xl" withBorder>
          <Text size="sm" fw={700} c="dimmed">最近待办</Text>
          <Title order={2}>{stats.todoTasks}</Title>
          <Text c="dimmed">待开始任务数</Text>
        </Card>
      </SimpleGrid>

      <div className="dashboard-panels">
        <Paper className="dashboard-panel" radius="xl" p="lg">
          <Group justify="space-between">
            <Title order={2}>最近待办任务</Title>
            <Badge variant="light" color="blue">{recentTodoTasks.length} 条</Badge>
          </Group>

          {recentTodoTasks.length > 0 ? (
            <div className="dashboard-task-list">
              {recentTodoTasks.map((task) => (
                <Card key={task.id ?? `${task.goal_id}-${task.title}`} className="dashboard-task-card" radius="xl" withBorder>
                  <Group justify="space-between" align="flex-start" className="dashboard-task-head">
                    <Text fw={700} c="dark.7">{task.title || '未命名任务'}</Text>
                    <Badge className={`dashboard-task-status is-${task.status ?? 'todo'}`} variant="light">
                      {getTaskStatusLabel(task.status)}
                    </Badge>
                  </Group>
                  <Text c="dimmed">{task.description || task.deliverables || '暂未填写任务说明。'}</Text>
                  <Group gap="sm" className="dashboard-task-meta">
                    <Text size="sm" c="dimmed">目标：{task.goal_title || '-'}</Text>
                    <Text size="sm" c="dimmed">阶段：{task.phase_title || '-'}</Text>
                    <Text size="sm" c="dimmed">更新于：{formatDateTime(task.updated_at)}</Text>
                  </Group>
                </Card>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state">
              <Text c="dimmed">{isLoading ? '任务加载中...' : '当前没有待办任务。'}</Text>
            </div>
          )}
        </Paper>

        <Paper className="dashboard-panel" radius="xl" p="lg">
          <Group justify="space-between">
            <Title order={2}>目标推进概览</Title>
            <Badge variant="light" color="blue">{recentGoals.length} 条</Badge>
          </Group>

          {recentGoals.length > 0 ? (
            <Stack className="dashboard-goal-list" gap="sm">
              {recentGoals.map((goal) => (
                <Card key={goal.id ?? goal.title} className="dashboard-goal-row" radius="xl" withBorder>
                  <Badge
                    className={`dashboard-task-status dashboard-goal-status ${getGoalStatusBadgeClass(getGoalDisplayStatus(goal))}`}
                    variant="light"
                  >
                    {getGoalStatusLabel(getGoalDisplayStatus(goal))}
                  </Badge>

                  <div className="dashboard-goal-head">
                    <div className="dashboard-goal-content">
                      <Text fw={700} c="dark.7">{goal.title || '未命名目标'}</Text>
                      <Text c="dimmed" mt={4}>{goal.description || '暂未填写目标描述。'}</Text>
                    </div>
                  </div>

                  <Group justify="flex-end" className="dashboard-goal-meta">
                    <Text size="sm" c="dimmed">{formatDateTime(goal.updated_at)}</Text>
                  </Group>
                </Card>
              ))}
            </Stack>
          ) : (
            <div className="dashboard-empty-state">
              <Text c="dimmed">{isLoading ? '目标加载中...' : '当前还没有目标。'}</Text>
            </div>
          )}
        </Paper>
      </div>
    </section>
  )
}
