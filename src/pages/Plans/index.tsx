import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core'
import type { GoalGoal, PlanPhase, PlanPlan, PlanTask } from '../../common/api'
import { goalsApi, plansApi } from '../../common/api'
import { useAppMessage } from '../../common/message/AppMessageProvider'
import { getGoalDisplayStatus, getGoalStatusLabel, getTaskStatusLabel } from '../../common/dicts'
import { formatDateTime } from '../../common/utils/date'
import './index.css'

function flattenPlanTasks(phases: PlanPhase[]) {
  return phases.flatMap((phase) => phase.tasks ?? [])
}

export function PlansPage() {
  const [goalList, setGoalList] = useState<GoalGoal[]>([])
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<PlanPlan | null>(null)
  const [isGoalsLoading, setIsGoalsLoading] = useState(false)
  const [isPlanLoading, setIsPlanLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const message = useAppMessage()

  const selectedGoal = goalList.find((goal) => goal.id === selectedGoalId) ?? null
  const phases = selectedPlan?.phases ?? []
  const taskList = useMemo(() => flattenPlanTasks(phases), [phases])
  const completedTasks = taskList.filter((task) => task.status === 'done').length

  function isPlanNotFoundError(error: unknown) {
    if (!(error instanceof Error)) {
      return false
    }

    return /计划不存在|暂无计划|not found|404|不存在/i.test(error.message)
  }

  async function loadPlan(goalId: number) {
    setIsPlanLoading(true)

    try {
      const response = await plansApi.goalPlanGet({
        id: goalId,
      })

      setSelectedPlan(response.data.data ?? null)
    } catch (error) {
      setSelectedPlan(null)

      if (!isPlanNotFoundError(error)) {
        message.error(error instanceof Error ? error.message : '获取计划详情失败。')
      }
    } finally {
      setIsPlanLoading(false)
    }
  }

  async function loadGoals() {
    setIsGoalsLoading(true)

    try {
      const response = await goalsApi.goalsList()
      const nextGoals = response.data.data?.list ?? []
      const resolvedGoalId = selectedGoalId ?? nextGoals[0]?.id ?? null

      setGoalList(nextGoals)
      setSelectedGoalId(resolvedGoalId)

      if (resolvedGoalId) {
        await loadPlan(resolvedGoalId)
      } else {
        setSelectedPlan(null)
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取目标列表失败。')
    } finally {
      setIsGoalsLoading(false)
    }
  }

  async function handleRegeneratePlan() {
    if (!selectedGoalId) {
      return
    }

    setIsRegenerating(true)

    try {
      const response = await plansApi.goalPlanRegenerate({
        id: selectedGoalId,
      })

      setSelectedPlan(response.data.data ?? null)
      message.success('计划已重新生成。')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重新生成计划失败。')
    } finally {
      setIsRegenerating(false)
    }
  }

  useEffect(() => {
    void loadGoals()
    // 首次进入时初始化计划数据。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="plans-shell">
      <div className="plans-column">
        <Paper className="plans-panel plans-list-panel" radius="xl" p="lg">
          <div className="plans-panel-header plans-list-header">
            <div>
              <Title order={1}>计划管理</Title>
              <Text mt="sm" c="dimmed">按目标查看 AI 生成的计划结构、阶段和任务分布。</Text>
            </div>
            <Button
              className="plans-list-refresh"
              variant="light"
              onClick={() => void loadGoals()}
              loading={isGoalsLoading}
            >
              {isGoalsLoading ? '刷新中...' : '刷新'}
            </Button>
          </div>

          {goalList.length > 0 ? (
            <div className="plans-goal-list">
              {goalList.map((goal) => {
                const isActive = goal.id === selectedGoalId

                return (
                  <UnstyledButton
                    key={goal.id ?? goal.title}
                    className={`plans-goal-item${isActive ? ' is-active' : ''}`}
                    onClick={() => {
                      if (!goal.id) {
                        return
                      }

                      setSelectedGoalId(goal.id)
                      void loadPlan(goal.id)
                    }}
                  >
                    <Stack gap={4} align="flex-start" justify="center" className="plans-goal-item-content">
                      <Text fw={700} c={isActive ? '#ffffff' : 'inherit'}>
                        {goal.title || '未命名目标'}
                      </Text>
                      <Text size="sm" c={isActive ? 'rgba(255,255,255,0.82)' : 'dimmed'}>
                        {getGoalStatusLabel(getGoalDisplayStatus(goal))}
                      </Text>
                    </Stack>
                  </UnstyledButton>
                )
              })}
            </div>
          ) : (
            <div className="plans-empty-state">
              <Text c="dimmed">{isGoalsLoading ? '目标加载中...' : '当前还没有目标。'}</Text>
            </div>
          )}
        </Paper>
      </div>

      <Paper className="plans-panel plans-detail-panel" radius="xl" p="lg">
        {selectedGoal ? (
          <>
            <Group justify="space-between" className="plans-panel-header">
              <div>
                <Title order={2}>{selectedGoal.title || '未命名目标'}</Title>
                <Text mt="sm" c="dimmed">{selectedGoal.description || '当前目标还没有补充描述。'}</Text>
              </div>
              <Button
                onClick={() => void handleRegeneratePlan()}
                disabled={!selectedGoalId}
                loading={isRegenerating}
              >
                {isRegenerating ? '重新生成中...' : '重新生成计划'}
              </Button>
            </Group>

            {selectedPlan ? (
              <>
                <SimpleGrid className="plans-metrics" cols={{ base: 1, sm: 2, xl: 4 }} spacing="sm">
                  <Card className="plans-metric-card" radius="xl" withBorder>
                    <Text size="sm" fw={700} c="dimmed">计划标题</Text>
                    <Text className="plans-metric-value is-title" fw={700}>
                      {selectedPlan.title || '-'}
                    </Text>
                  </Card>
                  <Card className="plans-metric-card" radius="xl" withBorder>
                    <Text size="sm" fw={700} c="dimmed">阶段数量</Text>
                    <Text className="plans-metric-value" fw={800}>
                      {phases.length}
                    </Text>
                  </Card>
                  <Card className="plans-metric-card" radius="xl" withBorder>
                    <Text size="sm" fw={700} c="dimmed">任务数量</Text>
                    <Text className="plans-metric-value" fw={800}>
                      {taskList.length}
                    </Text>
                  </Card>
                  <Card className="plans-metric-card" radius="xl" withBorder>
                    <Text size="sm" fw={700} c="dimmed">完成任务</Text>
                    <Text className="plans-metric-value" fw={800}>
                      {completedTasks}
                    </Text>
                  </Card>
                </SimpleGrid>

                <Paper className="plans-overview-card" radius="xl" p="lg" withBorder>
                  <Group justify="space-between" className="plans-overview-meta">
                    <Text size="sm" fw={700} c="dimmed">计划概述</Text>
                    <Text fw={700}>{formatDateTime(selectedPlan.updated_at)}</Text>
                  </Group>
                  <Text mt="sm" c="dimmed">{selectedPlan.overview || '暂未生成计划概述。'}</Text>
                </Paper>

                <div className="plans-phase-list">
                  {phases.map((phase, index) => (
                    <Card key={phase.id ?? `${phase.title}-${index}`} className="plans-phase-card" radius="xl" withBorder>
                      <Group justify="space-between" align="flex-start" className="plans-phase-header">
                        <div>
                          <Text className="plans-phase-index">阶段 {index + 1}</Text>
                          <Title order={3}>{phase.title || '未命名阶段'}</Title>
                        </div>
                        <Badge variant="light" color="blue">
                          {(phase.tasks ?? []).length} 个任务
                        </Badge>
                      </Group>

                      {phase.description ? <Text c="dimmed">{phase.description}</Text> : null}

                      {phase.tasks && phase.tasks.length > 0 ? (
                        <div className="plans-task-list">
                          {phase.tasks.map((task: PlanTask) => (
                            <Paper key={task.id ?? `${phase.id}-${task.title}`} className="plans-task-row" radius="lg" p="md" withBorder>
                              <div>
                                <Text fw={700}>{task.title || '未命名任务'}</Text>
                                <Text c="dimmed" mt={6}>{task.description || task.deliverables || '暂无任务说明。'}</Text>
                              </div>
                              <div className="plans-task-meta">
                                <Badge variant="light" color="blue">{getTaskStatusLabel(task.status)}</Badge>
                                <Text size="sm" c="dimmed">预计 {task.estimated_days ?? 0} 天</Text>
                              </div>
                            </Paper>
                          ))}
                        </div>
                      ) : (
                        <div className="plans-empty-inline">
                          <Text c="dimmed">该阶段暂时没有任务。</Text>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="plans-empty-state plans-detail-empty">
                <Text c="dimmed">
                  {isPlanLoading
                    ? '计划加载中...'
                    : '当前目标还没有计划，可以在目标中心生成，或点击右上角重新生成。'}
                </Text>
              </div>
            )}
          </>
        ) : (
          <div className="plans-empty-state plans-detail-empty">
            <Text c="dimmed">{isGoalsLoading ? '计划加载中...' : '请先选择一个目标。'}</Text>
          </div>
        )}
      </Paper>
    </section>
  )
}
