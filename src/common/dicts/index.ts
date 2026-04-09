import { GoalGoalStatus, PlanTaskStatus, TaskTaskStatus } from '../api'
import type { GoalGoal } from '../api'

export type GoalStatusOption = {
  label: string
  value: GoalGoalStatus
}

// 统一维护目标状态字典，后续页面展示和下拉选项都从这里取。
export const goalStatusOptions: GoalStatusOption[] = [
  {
    label: '未执行',
    value: GoalGoalStatus.GoalStatusDraft,
  },
  {
    label: '执行中',
    value: GoalGoalStatus.GoalStatusActive,
  },
  {
    label: '已完成',
    value: GoalGoalStatus.GoalStatusCompleted,
  },
  {
    label: '已归档',
    value: GoalGoalStatus.GoalStatusArchived,
  },
]

// 根据状态值获取展示文案，避免各页面重复判断。
export function getGoalStatusLabel(status?: GoalGoalStatus | null) {
  if (!status) {
    return '-'
  }

  return goalStatusOptions.find((item) => item.value === status)?.label ?? status
}

export function getGoalDisplayStatus(goal?: Pick<GoalGoal, 'aggregate_status' | 'status'> | null) {
  return goal?.aggregate_status ?? goal?.status ?? null
}

export type TaskStatusOption = {
  label: string
  value: TaskTaskStatus
}

export const taskStatusOptions: TaskStatusOption[] = [
  {
    label: '待开始',
    value: TaskTaskStatus.TaskStatusTodo,
  },
  {
    label: '进行中',
    value: TaskTaskStatus.TaskStatusInProgress,
  },
  {
    label: '已完成',
    value: TaskTaskStatus.TaskStatusDone,
  },
]

export function getTaskStatusLabel(status?: TaskTaskStatus | PlanTaskStatus | null) {
  if (!status) {
    return '-'
  }

  return taskStatusOptions.find((item) => item.value === status)?.label ?? status
}
