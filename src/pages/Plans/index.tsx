import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Pagination,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCalendarEvent,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import type {
  GoalGoal,
  PhaseUpdatePhaseRequest,
  PlanTaskPriority,
  PlanPhase,
  PlanPlan,
  PlanTask,
  TaskCreateTaskRequest,
  TaskTaskPriority,
  TaskUpdateTaskRequest,
} from "../../common/api";
import {
  goalsApi,
  phasesApi,
  plansApi,
  tasksApi,
  TaskTaskPriority as TaskPriorityEnum,
} from "../../common/api";
import { useAppMessage } from "../../common/message/AppMessageProvider";
import {
  getGoalDisplayStatus,
  getGoalStatusLabel,
  getTaskStatusLabel,
} from "../../common/dicts";
import { formatDateTime } from "../../common/utils/date";
import "./index.css";

function flattenPlanTasks(phases: PlanPhase[]) {
  return phases.flatMap((phase) => phase.tasks ?? []);
}

type PhaseFormState = {
  title: string;
  description: string;
  sort_order: string;
};

const emptyPhaseForm: PhaseFormState = {
  title: "",
  description: "",
  sort_order: "",
};

type PlanFormState = {
  title: string;
  overview: string;
};

type TaskModalMode = "create" | "edit";

type PlanTaskFormState = {
  title: string;
  description: string;
  deliverables: string;
  deadline: string;
  estimated_days: string;
  priority: "" | TaskTaskPriority;
  sort_order: string;
  phase_id: string;
};

const emptyPlanForm: PlanFormState = {
  title: "",
  overview: "",
};

const emptyTaskForm: PlanTaskFormState = {
  title: "",
  description: "",
  deliverables: "",
  deadline: "",
  estimated_days: "",
  priority: "",
  sort_order: "",
  phase_id: "",
};

const PLANS_GOAL_PAGE_SIZE = 6;

const taskPriorityOptions = [
  { value: TaskPriorityEnum.TaskPriorityHigh, label: "高" },
  { value: TaskPriorityEnum.TaskPriorityMedium, label: "中" },
  { value: TaskPriorityEnum.TaskPriorityLow, label: "低" },
];

function getTaskPriorityLabel(priority?: PlanTaskPriority | TaskTaskPriority | null) {
  if (!priority) {
    return "-";
  }

  return (
    taskPriorityOptions.find((item) => item.value === priority)?.label ?? priority
  );
}

function normalizeTaskPriority(
  priority?: PlanTaskPriority | TaskTaskPriority | null
): "" | TaskTaskPriority {
  if (!priority) {
    return "";
  }

  if (priority === "high") {
    return TaskPriorityEnum.TaskPriorityHigh;
  }

  if (priority === "medium") {
    return TaskPriorityEnum.TaskPriorityMedium;
  }

  if (priority === "low") {
    return TaskPriorityEnum.TaskPriorityLow;
  }

  return "";
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function toRfc3339Value(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

export function PlansPage() {
  const [goalList, setGoalList] = useState<GoalGoal[]>([]);
  const [goalPage, setGoalPage] = useState(1);
  const [goalTotal, setGoalTotal] = useState(0);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanPlan | null>(null);
  const [isGoalsLoading, setIsGoalsLoading] = useState(false);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [editingPhaseId, setEditingPhaseId] = useState<number | null>(null);
  const [phaseForm, setPhaseForm] = useState<PhaseFormState>(emptyPhaseForm);
  const [isPhaseLoading, setIsPhaseLoading] = useState(false);
  const [isPhaseSaving, setIsPhaseSaving] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planForm, setPlanForm] = useState<PlanFormState>(emptyPlanForm);
  const [isPlanSaving, setIsPlanSaving] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<TaskModalMode>("create");
  const [taskForm, setTaskForm] = useState<PlanTaskFormState>(emptyTaskForm);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [isTaskSaving, setIsTaskSaving] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<PlanTask | null>(null);
  const [isTaskDeleting, setIsTaskDeleting] = useState(false);
  const message = useAppMessage();

  const selectedGoal =
    goalList.find((goal) => goal.id === selectedGoalId) ?? null;
  const phases = selectedPlan?.phases ?? [];
  const taskList = useMemo(() => flattenPlanTasks(phases), [phases]);
  const completedTasks = taskList.filter(
    (task) => task.status === "done"
  ).length;

  function isPlanNotFoundError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    return /计划不存在|暂无计划|not found|404|不存在/i.test(error.message);
  }

  function updatePhaseField<Key extends keyof PhaseFormState>(
    key: Key,
    value: PhaseFormState[Key]
  ) {
    setPhaseForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updatePlanField<Key extends keyof PlanFormState>(
    key: Key,
    value: PlanFormState[Key]
  ) {
    setPlanForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateTaskField<Key extends keyof PlanTaskFormState>(
    key: Key,
    value: PlanTaskFormState[Key]
  ) {
    setTaskForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function loadPlan(goalId: number) {
    setIsPlanLoading(true);

    try {
      const response = await plansApi.goalPlanGet({
        id: goalId,
      });

      setSelectedPlan(response.data.data ?? null);
    } catch (error) {
      setSelectedPlan(null);

      if (!isPlanNotFoundError(error)) {
        message.error(
          error instanceof Error ? error.message : "获取计划详情失败。"
        );
      }
    } finally {
      setIsPlanLoading(false);
    }
  }

  async function loadGoals(page = goalPage) {
    setIsGoalsLoading(true);

    try {
      const response = await goalsApi.goalsList({
        page,
        pageSize: PLANS_GOAL_PAGE_SIZE,
      });
      const nextData = response.data.data;
      const nextGoals = nextData?.list ?? [];
      const nextPage = nextData?.page ?? page;
      const nextTotal = nextData?.total ?? nextGoals.length;
      const resolvedGoalId =
        selectedGoalId && nextGoals.some((goal) => goal.id === selectedGoalId)
          ? selectedGoalId
          : nextGoals[0]?.id ?? null;

      setGoalList(nextGoals);
      setGoalPage(nextPage);
      setGoalTotal(nextTotal);
      setSelectedGoalId(resolvedGoalId);

      if (resolvedGoalId) {
        await loadPlan(resolvedGoalId);
      } else {
        setSelectedPlan(null);
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "获取目标列表失败。"
      );
    } finally {
      setIsGoalsLoading(false);
    }
  }

  async function handleRegeneratePlan() {
    if (!selectedGoalId) {
      return;
    }

    setIsRegenerating(true);

    try {
      const response = await plansApi.goalPlanRegenerate({
        id: selectedGoalId,
      });

      setSelectedPlan(response.data.data ?? null);
      message.success("计划已重新生成。");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "重新生成计划失败。"
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleDeletePlan() {
    if (!selectedGoalId || !selectedPlan) {
      return;
    }

    setIsDeletingPlan(true);

    try {
      await plansApi.goalPlanDelete({
        id: selectedGoalId,
      });

      setSelectedPlan(null);
      setIsDeleteModalOpen(false);
      message.success("计划已删除。");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "删除计划失败。"
      );
    } finally {
      setIsDeletingPlan(false);
    }
  }

  function openPlanModal() {
    setPlanForm({
      title: selectedPlan?.title ?? "",
      overview: selectedPlan?.overview ?? "",
    });
    setIsPlanModalOpen(true);
  }

  function closePlanModal() {
    if (isPlanSaving) {
      return;
    }

    setIsPlanModalOpen(false);
    setPlanForm(emptyPlanForm);
  }

  async function openPhaseModal(phaseId: number) {
    setEditingPhaseId(phaseId);
    setIsPhaseModalOpen(true);
    setIsPhaseLoading(true);

    try {
      const response = await phasesApi.phaseGet({
        id: phaseId,
      });
      const phase = response.data.data;

      setPhaseForm({
        title: phase?.title ?? "",
        description: phase?.description ?? "",
        sort_order:
          phase?.sort_order !== undefined && phase?.sort_order !== null
            ? String(phase.sort_order)
            : "",
      });
    } catch (error) {
      setIsPhaseModalOpen(false);
      setEditingPhaseId(null);
      setPhaseForm(emptyPhaseForm);
      message.error(
        error instanceof Error ? error.message : "获取阶段详情失败。"
      );
    } finally {
      setIsPhaseLoading(false);
    }
  }

  function closePhaseModal() {
    if (isPhaseSaving) {
      return;
    }

    setIsPhaseModalOpen(false);
    setEditingPhaseId(null);
    setPhaseForm(emptyPhaseForm);
    setIsPhaseLoading(false);
  }

  function openCreateTaskModal(phase: PlanPhase) {
    setTaskModalMode("create");
    setEditingTaskId(null);
    setTaskForm({
      ...emptyTaskForm,
      phase_id: phase.id ? String(phase.id) : "",
    });
    setIsTaskModalOpen(true);
  }

  function openEditTaskModal(task: PlanTask) {
    setTaskModalMode("edit");
    setEditingTaskId(task.id ?? null);
    setTaskForm({
      title: task.title ?? "",
      description: task.description ?? "",
      deliverables: task.deliverables ?? "",
      deadline: toDateTimeLocalValue(task.deadline),
      estimated_days: task.estimated_days ? String(task.estimated_days) : "",
      priority: normalizeTaskPriority(task.priority),
      sort_order: task.sort_order ? String(task.sort_order) : "",
      phase_id: task.phase_id ? String(task.phase_id) : "",
    });
    setIsTaskModalOpen(true);
  }

  function closeTaskModal() {
    if (isTaskSaving) {
      return;
    }

    setIsTaskModalOpen(false);
    setTaskModalMode("create");
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm);
  }

  async function handleSavePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedGoalId) {
      return;
    }

    if (!planForm.title.trim()) {
      message.error("请输入计划标题。");
      return;
    }

    setIsPlanSaving(true);

    try {
      const response = await plansApi.goalPlanUpdate({
        id: selectedGoalId,
        request: {
          title: planForm.title.trim(),
          overview: planForm.overview.trim() || undefined,
        },
      });

      setSelectedPlan(response.data.data ?? null);
      closePlanModal();
      message.success("计划信息已更新。");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "更新计划失败。"
      );
    } finally {
      setIsPlanSaving(false);
    }
  }

  async function handleSavePhase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingPhaseId) {
      return;
    }

    if (!phaseForm.title.trim()) {
      message.error("请输入阶段标题。");
      return;
    }

    const request: PhaseUpdatePhaseRequest = {
      title: phaseForm.title.trim(),
      description: phaseForm.description.trim() || undefined,
      sort_order: phaseForm.sort_order ? Number(phaseForm.sort_order) : undefined,
    };

    setIsPhaseSaving(true);

    try {
      await phasesApi.phaseUpdate({
        id: editingPhaseId,
        request,
      });

      if (selectedGoalId) {
        await loadPlan(selectedGoalId);
      }

      closePhaseModal();
      message.success("阶段信息已更新。");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "更新阶段失败。"
      );
    } finally {
      setIsPhaseSaving(false);
    }
  }

  async function handleSaveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      message.error("请输入任务标题。");
      return;
    }

    if (!taskForm.phase_id) {
      message.error("请选择所属阶段。");
      return;
    }

    const request: TaskCreateTaskRequest | TaskUpdateTaskRequest = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || undefined,
      deliverables: taskForm.deliverables.trim() || undefined,
      deadline: toRfc3339Value(taskForm.deadline),
      estimated_days: taskForm.estimated_days
        ? Number(taskForm.estimated_days)
        : undefined,
      priority: taskForm.priority || undefined,
      sort_order: taskForm.sort_order ? Number(taskForm.sort_order) : undefined,
      phase_id: Number(taskForm.phase_id),
    };

    setIsTaskSaving(true);

    try {
      if (taskModalMode === "create") {
        await tasksApi.taskCreate({
          request,
        });
        message.success("任务创建成功。");
      } else {
        if (!editingTaskId) {
          throw new Error("缺少需要编辑的任务 ID。");
        }

        await tasksApi.taskUpdate({
          id: editingTaskId,
          request,
        });
        message.success("任务已更新。");
      }

      if (selectedGoalId) {
        await loadPlan(selectedGoalId);
      }

      closeTaskModal();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "保存任务失败。"
      );
    } finally {
      setIsTaskSaving(false);
    }
  }

  async function handleDeleteTask() {
    if (!taskToDelete?.id) {
      return;
    }

    setIsTaskDeleting(true);

    try {
      await tasksApi.taskDelete({
        id: taskToDelete.id,
      });

      if (selectedGoalId) {
        await loadPlan(selectedGoalId);
      }

      setTaskToDelete(null);
      message.success("任务已删除。");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "删除任务失败。"
      );
    } finally {
      setIsTaskDeleting(false);
    }
  }

  useEffect(() => {
    void loadGoals();
    // 首次进入时初始化计划数据。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="plans-shell">
      <div className="plans-column">
        <Paper className="plans-panel plans-list-panel" radius="xl" p="lg">
          <div className="plans-panel-header plans-list-header">
            <div>
              <Title order={1}>计划管理</Title>
              <Text mt="sm" c="dimmed">
                按目标查看 AI 生成的计划结构、阶段和任务分布。
              </Text>
            </div>
            <Button
              className="plans-list-refresh"
              variant="light"
              onClick={() => void loadGoals()}
              loading={isGoalsLoading}
            >
              刷新
            </Button>
          </div>

          {goalList.length > 0 ? (
            <div className="plans-goal-list">
              {goalList.map((goal) => {
                const isActive = goal.id === selectedGoalId;

                return (
                  <UnstyledButton
                    key={goal.id ?? goal.title}
                    className={`plans-goal-item${isActive ? " is-active" : ""}`}
                    onClick={() => {
                      if (!goal.id) {
                        return;
                      }

                      setSelectedGoalId(goal.id);
                      void loadPlan(goal.id);
                    }}
                  >
                    <Stack
                      gap={4}
                      align="flex-start"
                      justify="center"
                      className="plans-goal-item-content"
                    >
                      <Text fw={700} c={isActive ? "#ffffff" : "inherit"}>
                        {goal.title || "未命名目标"}
                      </Text>
                      <Text
                        size="sm"
                        c={isActive ? "rgba(255,255,255,0.82)" : "dimmed"}
                      >
                        {getGoalStatusLabel(getGoalDisplayStatus(goal))}
                      </Text>
                    </Stack>
                  </UnstyledButton>
                );
              })}
            </div>
            ) : (
              <div className="plans-empty-state">
                <Text c="dimmed">
                  {isGoalsLoading ? "目标加载中..." : "当前还没有目标。"}
                </Text>
              </div>
            )}

          {goalTotal > PLANS_GOAL_PAGE_SIZE ? (
            <Pagination
              className="plans-pagination"
              total={Math.ceil(goalTotal / PLANS_GOAL_PAGE_SIZE)}
              value={goalPage}
              onChange={(page) => void loadGoals(page)}
              disabled={isGoalsLoading}
              siblings={1}
              boundaries={1}
            />
          ) : null}
        </Paper>
      </div>

      <Paper className="plans-panel plans-detail-panel" radius="xl" p="lg">
        {selectedGoal ? (
          <>
            <Group justify="space-between" className="plans-panel-header">
              <div>
                <Title order={2}>{selectedGoal.title || "未命名目标"}</Title>
                <Text mt="sm" c="dimmed">
                  {selectedGoal.description || "当前目标还没有补充描述。"}
                </Text>
              </div>
              <div className="plans-header-actions">
                <Button
                  variant="light"
                  color="gray"
                  onClick={openPlanModal}
                  disabled={!selectedPlan}
                >
                  编辑计划
                </Button>
                <Button
                  onClick={() => void handleRegeneratePlan()}
                  disabled={!selectedGoalId}
                  loading={isRegenerating}
                >
                  {isRegenerating ? "重新生成中..." : "重新生成计划"}
                </Button>
                 <Button
                  color="red"
                  variant="light"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={!selectedPlan || isDeletingPlan}
                >
                  删除计划
                </Button>
              </div>
            </Group>

            {selectedPlan ? (
              <>
                <SimpleGrid
                  className="plans-metrics"
                  cols={{ base: 1, sm: 2, xl: 4 }}
                  spacing="sm"
                >
                  <Card className="plans-metric-card" radius="xl" withBorder>
                    <Text size="sm" fw={700} c="dimmed">
                      计划标题
                    </Text>
                    <Text className="plans-metric-value is-title" fw={700}>
                      {selectedPlan.title || "-"}
                    </Text>
                  </Card>
                  <Card className="plans-metric-card" radius="xl" withBorder>
                    <Text size="sm" fw={700} c="dimmed">
                      阶段数量
                    </Text>
                    <Text className="plans-metric-value" fw={800}>
                      {phases.length}
                    </Text>
                  </Card>
                  <Card className="plans-metric-card" radius="xl" withBorder>
                    <Text size="sm" fw={700} c="dimmed">
                      任务数量
                    </Text>
                    <Text className="plans-metric-value" fw={800}>
                      {taskList.length}
                    </Text>
                  </Card>
                  <Card className="plans-metric-card" radius="xl" withBorder>
                    <Text size="sm" fw={700} c="dimmed">
                      完成任务
                    </Text>
                    <Text className="plans-metric-value" fw={800}>
                      {completedTasks}
                    </Text>
                  </Card>
                </SimpleGrid>

                <Paper
                  className="plans-overview-card"
                  radius="xl"
                  p="lg"
                  withBorder
                >
                  <Group
                    justify="space-between"
                    className="plans-overview-meta"
                  >
                    <Text size="sm" fw={700} c="dimmed">
                      计划概述
                    </Text>
                    <Text fw={700}>
                      {formatDateTime(selectedPlan.updated_at)}
                    </Text>
                  </Group>
                  <Text mt="sm" c="dimmed">
                    {selectedPlan.overview || "暂未生成计划概述。"}
                  </Text>
                </Paper>

                <div className="plans-phase-list">
                  {phases.map((phase, index) => (
                    <Card
                      key={phase.id ?? `${phase.title}-${index}`}
                      className="plans-phase-card"
                      radius="xl"
                      withBorder
                    >
                      <Group
                        justify="space-between"
                        align="flex-start"
                        className="plans-phase-header"
                      >
                        <div>
                          <Text className="plans-phase-index">
                            阶段 {index + 1}
                          </Text>
                          <Title order={3}>{phase.title || "未命名阶段"}</Title>
                        </div>
                        <div className="plans-phase-actions">
                          <Badge variant="light" color="blue">
                            {(phase.tasks ?? []).length} 个任务
                          </Badge>
                          <Button
                            variant="light"
                            color="blue"
                            onClick={() => openCreateTaskModal(phase)}
                            disabled={!phase.id}
                          >
                            新增任务
                          </Button>
                          <Button
                            variant="light"
                            color="gray"
                            onClick={() => {
                              if (!phase.id) {
                                return;
                              }

                              void openPhaseModal(phase.id);
                            }}
                            disabled={!phase.id}
                          >
                            编辑阶段
                          </Button>
                        </div>
                      </Group>

                      {phase.description ? (
                        <Text c="dimmed">{phase.description}</Text>
                      ) : null}

                      {phase.tasks && phase.tasks.length > 0 ? (
                        <div className="plans-task-list">
                          {phase.tasks.map((task: PlanTask) => (
                            <Paper
                              key={task.id ?? `${phase.id}-${task.title}`}
                              className="plans-task-row"
                              radius="lg"
                              p="md"
                              withBorder
                            >
                              <div>
                                <Text fw={700}>
                                  {task.title || "未命名任务"}
                                </Text>
                                <Text c="dimmed" mt={6}>
                                  {task.description ||
                                    task.deliverables ||
                                    "暂无任务说明。"}
                                </Text>
                              </div>
                              <div className="plans-task-meta">
                                <Badge variant="light" color="blue">
                                  {getTaskStatusLabel(task.status)}
                                </Badge>
                                <Text size="sm" c="dimmed">
                                  优先级 {getTaskPriorityLabel(task.priority)}
                                </Text>
                                <Text size="sm" c="dimmed">
                                  截止 {formatDateTime(task.deadline)}
                                </Text>
                                <Text size="sm" c="dimmed">
                                  预计 {task.estimated_days ?? 0} 天
                                </Text>
                                <Group gap="xs" className="plans-task-actions">
                                  <Button
                                    className="plans-task-action-button plans-task-action-button--edit"
                                    variant="filled"
                                    color="blue"
                                    leftSection={<IconPencil size={15} stroke={1.9} />}
                                    onClick={() => openEditTaskModal(task)}
                                    disabled={!task.id}
                                  >
                                    编辑任务
                                  </Button>
                                  <Button
                                    className="plans-task-action-button plans-task-action-button--delete"
                                    variant="light"
                                    color="red"
                                    leftSection={<IconTrash size={15} stroke={1.9} />}
                                    onClick={() => setTaskToDelete(task)}
                                    disabled={!task.id}
                                  >
                                    删除任务
                                  </Button>
                                </Group>
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
                    ? "计划加载中..."
                    : "当前目标还没有计划，可以在目标中心生成，或点击右上角重新生成。"}
                </Text>
              </div>
            )}
          </>
        ) : (
          <div className="plans-empty-state plans-detail-empty">
            <Text c="dimmed">
              {isGoalsLoading ? "计划加载中..." : "请先选择一个目标。"}
            </Text>
          </div>
        )}
      </Paper>

      <Modal
        opened={isPlanModalOpen}
        onClose={closePlanModal}
        title="编辑计划"
        centered
        radius="md"
      >
        <form className="plans-phase-form" onSubmit={handleSavePlan}>
          <Stack gap="md">
            <TextInput
              label="计划标题"
              value={planForm.title}
              onChange={(event) =>
                updatePlanField("title", event.currentTarget.value)
              }
              placeholder="请输入计划标题"
              required
            />

            <Textarea
              label="计划概述"
              minRows={5}
              value={planForm.overview}
              onChange={(event) =>
                updatePlanField("overview", event.currentTarget.value)
              }
              placeholder="请输入计划概述"
            />

            <Group justify="flex-end">
              <Button
                variant="light"
                color="gray"
                onClick={closePlanModal}
                disabled={isPlanSaving}
              >
                取消
              </Button>
              <Button type="submit" loading={isPlanSaving}>
                保存计划
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingPlan) {
            setIsDeleteModalOpen(false);
          }
        }}
        title="删除计划"
        centered
        radius="md"
      >
        <Stack gap="md">
          <Text c="dimmed">
            删除计划会将计划下的阶段和任务全部删除，是否删除？
          </Text>

          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeletingPlan}
            >
              取消
            </Button>
            <Button
              color="red"
              onClick={() => void handleDeletePlan()}
              loading={isDeletingPlan}
            >
              删除计划
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={isPhaseModalOpen}
        onClose={closePhaseModal}
        title="编辑阶段"
        centered
        radius="md"
      >
        {isPhaseLoading ? (
          <div className="plans-empty-inline">
            <Text c="dimmed">阶段详情加载中...</Text>
          </div>
        ) : (
          <form className="plans-phase-form" onSubmit={handleSavePhase}>
            <Stack gap="md">
              <TextInput
                label="阶段标题"
                value={phaseForm.title}
                onChange={(event) =>
                  updatePhaseField("title", event.currentTarget.value)
                }
                placeholder="请输入阶段标题"
                required
              />

              <Textarea
                label="阶段描述"
                minRows={4}
                value={phaseForm.description}
                onChange={(event) =>
                  updatePhaseField("description", event.currentTarget.value)
                }
                placeholder="请输入阶段描述"
              />

              <TextInput
                label="排序值"
                value={phaseForm.sort_order}
                onChange={(event) =>
                  updatePhaseField("sort_order", event.currentTarget.value)
                }
                placeholder="例如：1"
              />

              <Group justify="flex-end">
                <Button
                  variant="light"
                  color="gray"
                  onClick={closePhaseModal}
                  disabled={isPhaseSaving}
                >
                  取消
                </Button>
                <Button type="submit" loading={isPhaseSaving}>
                  保存阶段
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>

      <Modal
        opened={isTaskModalOpen}
        onClose={closeTaskModal}
        title={taskModalMode === "create" ? "新增任务" : "编辑任务"}
        centered
        radius="md"
        size={920}
        classNames={{
          body: "plans-task-modal-body",
        }}
      >
        <form className="plans-phase-form" onSubmit={handleSaveTask}>
          <Stack gap="md">
            <TextInput
              label="任务标题"
              size="md"
              value={taskForm.title}
              onChange={(event) =>
                updateTaskField("title", event.currentTarget.value)
              }
              placeholder="请输入任务标题"
              required
            />

            <Textarea
              label="任务描述"
              size="md"
              minRows={4}
              value={taskForm.description}
              onChange={(event) =>
                updateTaskField("description", event.currentTarget.value)
              }
              placeholder="请输入任务描述"
            />

            <Textarea
              label="预期产出"
              size="md"
              minRows={3}
              value={taskForm.deliverables}
              onChange={(event) =>
                updateTaskField("deliverables", event.currentTarget.value)
              }
              placeholder="请输入这项任务完成后要产出的结果"
            />

            <Select
              label="所属阶段"
              size="md"
              value={taskForm.phase_id || null}
              data={phases
                .filter((phase) => phase.id)
                .map((phase) => ({
                  value: String(phase.id),
                  label: phase.title || `阶段 ${phase.id}`,
                }))}
              onChange={(value) => updateTaskField("phase_id", value ?? "")}
              searchable
            />

            <div className="plans-task-form-grid">
              <div className="plans-task-form-field plans-task-form-field--wide">
                <TextInput
                  className="plans-task-datetime-input"
                  label="任务截止时间"
                  description="选择任务最晚完成的日期和时间"
                  type="datetime-local"
                  size="md"
                  leftSection={<IconCalendarEvent size={18} stroke={1.8} />}
                  value={taskForm.deadline}
                  onChange={(event) =>
                    updateTaskField("deadline", event.currentTarget.value)
                  }
                />
              </div>

              <TextInput
                label="预计天数"
                size="md"
                value={taskForm.estimated_days}
                onChange={(event) =>
                  updateTaskField("estimated_days", event.currentTarget.value)
                }
                placeholder="例如：3"
              />

              <Select
                label="优先级"
                size="md"
                value={taskForm.priority || null}
                data={taskPriorityOptions}
                clearable
                onChange={(value) =>
                  updateTaskField(
                    "priority",
                    (value ?? "") as PlanTaskFormState["priority"]
                  )
                }
              />

              <TextInput
                label="排序值"
                size="md"
                value={taskForm.sort_order}
                onChange={(event) =>
                  updateTaskField("sort_order", event.currentTarget.value)
                }
                placeholder="例如：1"
              />
            </div>

            <Group justify="flex-end">
              <Button
                variant="light"
                color="gray"
                onClick={closeTaskModal}
                disabled={isTaskSaving}
              >
                取消
              </Button>
              <Button type="submit" loading={isTaskSaving}>
                {taskModalMode === "create" ? "创建任务" : "保存任务"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={Boolean(taskToDelete)}
        onClose={() => {
          if (!isTaskDeleting) {
            setTaskToDelete(null);
          }
        }}
        title="删除任务"
        centered
        radius="md"
      >
        <Stack gap="md">
          <Text c="dimmed">
            删除任务“{taskToDelete?.title ?? "未命名任务"}”后将无法恢复，是否删除？
          </Text>

          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              onClick={() => setTaskToDelete(null)}
              disabled={isTaskDeleting}
            >
              取消
            </Button>
            <Button color="red" onClick={() => void handleDeleteTask()} loading={isTaskDeleting}>
              删除任务
            </Button>
          </Group>
        </Stack>
      </Modal>
    </section>
  );
}
