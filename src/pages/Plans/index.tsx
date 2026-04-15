import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  Badge,
  Button,
  Card,
  Group,
  Pagination,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type {
  GoalGoal,
  PhaseNextStepSuggestion,
  PlanNextStepSuggestion,
  PhaseUpdatePhaseRequest,
  PlanTaskPriority,
  PlanPhase,
  PlanPlan,
  PlanTask,
  TaskNextStepSuggestion,
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
import { ConfirmActionModal } from "../../common/components/ConfirmActionModal";
import { formatDateTime } from "../../common/utils/date";
import "./index.css";
import { PhaseEditModal } from "./components/PhaseEditModal";
import { NextSuggesModal } from "./components/NextSuggesModal";
import { PlanEditModal } from "./components/PlanEditModal";
import { SortableTaskItem } from "./components/SortableTaskItem";
import { TaskEditModal } from "./components/TaskEditModal";
import {
  emptyPhaseForm,
  emptyPlanForm,
  emptyTaskForm,
  type PhaseFormState,
  type PlanFormState,
  type PlanTaskFormState,
  taskPriorityOptions,
  type TaskModalMode,
} from "./components/formState";

function flattenPlanTasks(phases: PlanPhase[]) {
  return phases.flatMap((phase) => phase.tasks ?? []);
}

const PLANS_GOAL_PAGE_SIZE = 6;

function getTaskPriorityLabel(
  priority?: PlanTaskPriority | TaskTaskPriority | null
) {
  if (!priority) {
    return "-";
  }

  return (
    taskPriorityOptions.find((item) => item.value === priority)?.label ??
    priority
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

type SuggestionScope = "plan" | "phase" | "task";

type ExecutionSuggestion =
  | PlanNextStepSuggestion
  | PhaseNextStepSuggestion
  | TaskNextStepSuggestion;

type SuggestionModalState = {
  opened: boolean;
  scope: SuggestionScope;
  entityId: number | null;
  title: string;
  emptyText: string;
  suggestion: ExecutionSuggestion | null;
};

const emptySuggestionModalState: SuggestionModalState = {
  opened: false,
  scope: "plan",
  entityId: null,
  title: "",
  emptyText: "",
  suggestion: null,
};

function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  );
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
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
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
  const [activeSuggestionRequest, setActiveSuggestionRequest] = useState<{
    scope: SuggestionScope | null;
    entityId: number | null;
  }>({
    scope: null,
    entityId: null,
  });
  const [suggestionModalState, setSuggestionModalState] =
    useState<SuggestionModalState>(emptySuggestionModalState);
  const [sortingPhaseId, setSortingPhaseId] = useState<number | null>(null);
  const message = useAppMessage();

  const selectedGoal =
    goalList.find((goal) => goal.id === selectedGoalId) ?? null;
  const phases = useMemo(
    () => selectedPlan?.phases ?? [],
    [selectedPlan?.phases]
  );
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

  function isSuggestionNotFoundError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    return /执行建议不存在|计划执行建议不存在|阶段执行建议不存在|任务执行建议不存在|not found|404|不存在/i.test(
      error.message
    );
  }

  function getSuggestionScopeLabel(scope: SuggestionScope) {
    if (scope === "plan") {
      return "计划";
    }

    if (scope === "phase") {
      return "阶段";
    }

    return "任务";
  }

  function isSuggestionLoading(scope: SuggestionScope, entityId?: number | null) {
    return (
      activeSuggestionRequest.scope === scope &&
      activeSuggestionRequest.entityId === entityId
    );
  }

  function openSuggestionModal(
    scope: SuggestionScope,
    entityId: number,
    suggestion: ExecutionSuggestion | null
  ) {
    const scopeLabel = getSuggestionScopeLabel(scope);

    setSuggestionModalState({
      opened: true,
      scope,
      entityId,
      title: `${scopeLabel}执行建议`,
      emptyText: `当前没有可展示的${scopeLabel}执行建议。`,
      suggestion,
    });
  }

  function closeSuggestionModal() {
    setSuggestionModalState((current) => ({
      ...current,
      opened: false,
    }));
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
      setIsRegenerateModalOpen(false);
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
      message.error(error instanceof Error ? error.message : "删除计划失败。");
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
      message.error(error instanceof Error ? error.message : "更新计划失败。");
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
      sort_order: phaseForm.sort_order
        ? Number(phaseForm.sort_order)
        : undefined,
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
      message.error(error instanceof Error ? error.message : "更新阶段失败。");
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
      message.error(error instanceof Error ? error.message : "保存任务失败。");
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
      message.error(error instanceof Error ? error.message : "删除任务失败。");
    } finally {
      setIsTaskDeleting(false);
    }
  }

  async function handlePhaseTaskDragEnd(
    phaseId: number,
    phaseTasks: PlanTask[],
    event: DragEndEvent
  ) {
    // 拖拽结束时，active.id 是被拖动元素的 ID，over.id 是当前拖动位置所在元素的 ID。
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // 拖拽前后的索引位置
    const oldIndex = phaseTasks.findIndex(
      (task) => String(task.id) === String(active.id)
    );
    const newIndex = phaseTasks.findIndex(
      (task) => String(task.id) === String(over.id)
    );

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    // arrayMove 会返回一个新的数组，原数组保持不变。计算出新的任务顺序
    const nextTasks = arrayMove(phaseTasks, oldIndex, newIndex);
    const nextTaskIds = nextTasks
      .map((task) => task.id)
      .filter((id): id is number => typeof id === "number");

    if (nextTaskIds.length !== nextTasks.length) {
      message.error("当前阶段存在缺少任务 ID 的数据，暂时无法调整顺序。");
      return;
    }

    setSelectedPlan((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        phases: (current.phases ?? []).map((phase) =>
          phase.id === phaseId
            ? {
                ...phase,
                tasks: nextTasks,
              }
            : phase
        ),
      };
    });

    setSortingPhaseId(phaseId);

    try {
      await tasksApi.phaseTasksSort({
        id: phaseId,
        request: {
          task_ids: nextTaskIds,
        },
      });

      message.success("阶段任务顺序已更新。");
    } catch (error) {
      setSelectedPlan((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          phases: (current.phases ?? []).map((phase) =>
            phase.id === phaseId
              ? {
                  ...phase,
                  tasks: phaseTasks,
                }
              : phase
          ),
        };
      });

      message.error(
        error instanceof Error ? error.message : "更新阶段任务顺序失败。"
      );
    } finally {
      setSortingPhaseId((current) => (current === phaseId ? null : current));
    }
  }

  async function getExecutionSuggestion(
    scope: SuggestionScope,
    entityId: number
  ) {
    if (scope === "plan") {
      const result = await plansApi.planNextStepGet({
        id: entityId,
      });
      return result.data.data ?? null;
    }

    if (scope === "phase") {
      const result = await phasesApi.phaseNextStepGet({
        id: entityId,
      });
      return result.data.data ?? null;
    }

    const result = await tasksApi.taskNextStepGet({
      id: entityId,
    });
    return result.data.data ?? null;
  }

  async function generateExecutionSuggestion(
    scope: SuggestionScope,
    entityId: number
  ) {
    if (scope === "plan") {
      const result = await plansApi.planNextStepSuggest({
        id: entityId,
      });
      return result.data.data ?? null;
    }

    if (scope === "phase") {
      const result = await phasesApi.phaseNextStepSuggest({
        id: entityId,
      });
      return result.data.data ?? null;
    }

    const result = await tasksApi.taskNextStepSuggest({
      id: entityId,
    });
    return result.data.data ?? null;
  }

  async function handleSuggestion(scope: SuggestionScope, entityId: number) {
    const scopeLabel = getSuggestionScopeLabel(scope);

    setActiveSuggestionRequest({
      scope,
      entityId,
    });

    try {
      const suggestion = await getExecutionSuggestion(scope, entityId);

      if (suggestion) {
        openSuggestionModal(scope, entityId, suggestion);
        return;
      }

      const generatedSuggestion = await generateExecutionSuggestion(
        scope,
        entityId
      );
      openSuggestionModal(scope, entityId, generatedSuggestion);
    } catch (error) {
      if (isSuggestionNotFoundError(error)) {
        try {
          const generatedSuggestion = await generateExecutionSuggestion(
            scope,
            entityId
          );
          openSuggestionModal(scope, entityId, generatedSuggestion);
          return;
        } catch (generateError) {
          message.error(
            generateError instanceof Error
              ? generateError.message
              : `生成${scopeLabel}执行建议失败。`
          );
          return;
        }
      }

      message.error(
        error instanceof Error
          ? error.message
          : `获取${scopeLabel}执行建议失败。`
      );
    } finally {
      setActiveSuggestionRequest({
        scope: null,
        entityId: null,
      });
    }
  }

  async function handleRegenerateSuggestion() {
    if (!suggestionModalState.entityId) {
      message.error("当前没有可用的执行建议对象。");
      return;
    }

    const { scope, entityId } = suggestionModalState;
    const scopeLabel = getSuggestionScopeLabel(scope);

    setActiveSuggestionRequest({
      scope,
      entityId,
    });

    try {
      const suggestion = await generateExecutionSuggestion(scope, entityId);
      openSuggestionModal(scope, entityId, suggestion);
      message.success(`${scopeLabel}执行建议已重新生成。`);
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : `重新生成${scopeLabel}执行建议失败。`
      );
    } finally {
      setActiveSuggestionRequest({
        scope: null,
        entityId: null,
      });
    }
  }

  useEffect(() => {
    void loadGoals();
    // 首次进入时初始化计划数据。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAnySuggestionLoading = activeSuggestionRequest.scope !== null;

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
                  onClick={() => setIsRegenerateModalOpen(true)}
                  disabled={!selectedGoalId || isRegenerating}
                  loading={isRegenerating}
                >
                  {isRegenerating ? "重新生成中..." : "重新生成计划"}
                </Button>
                <Button
                  variant="light"
                  color="gray"
                  onClick={() => {
                    if (!selectedPlan?.id) {
                      return;
                    }

                    void handleSuggestion("plan", selectedPlan.id);
                  }}
                  disabled={!selectedPlan || isAnySuggestionLoading}
                  loading={isSuggestionLoading("plan", selectedPlan?.id)}
                >
                  计划执行建议
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
                            color="gray"
                            onClick={() => {
                              if (!phase.id) {
                                return;
                              }

                              void handleSuggestion("phase", phase.id);
                            }}
                            disabled={!phase.id || isAnySuggestionLoading}
                            loading={isSuggestionLoading("phase", phase.id)}
                          >
                            阶段执行建议
                          </Button>
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
                        <DndContext
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => {
                            if (!phase.id || sortingPhaseId === phase.id) {
                              return;
                            }

                            void handlePhaseTaskDragEnd(
                              phase.id,
                              phase.tasks ?? [],
                              event
                            );
                          }}
                        >
                          <SortableContext
                            items={phase.tasks
                              .filter(
                                (task): task is PlanTask & { id: number } =>
                                  typeof task.id === "number"
                              )
                              .map((task) => String(task.id))}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="plans-task-list">
                              {phase.tasks.map((task: PlanTask) => (
                                <SortableTaskItem
                                  key={task.id ?? `${phase.id}-${task.title}`}
                                  id={String(task.id)}
                                >
                                  {(dragHandle) => (
                                    <Paper
                                      className="plans-task-row"
                                      radius="lg"
                                      p="md"
                                      withBorder
                                    >
                                      <div className="plans-task-main">
                                        <div className="plans-task-title-row">
                                          {dragHandle}
                                          <Text fw={700}>
                                            {task.title || "未命名任务"}
                                          </Text>
                                        </div>
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
                                          优先级{" "}
                                          {getTaskPriorityLabel(task.priority)}
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                          截止 {formatDateTime(task.deadline)}
                                        </Text>
                                        <Text size="sm" c="dimmed">
                                          预计 {task.estimated_days ?? 0} 天
                                        </Text>
                                        <Group
                                          gap="xs"
                                          className="plans-task-actions"
                                        >
                                          <Button
                                            className="plans-task-action-button"
                                            variant="light"
                                            color="gray"
                                            onClick={() => {
                                              if (!task.id) {
                                                return;
                                              }

                                              void handleSuggestion(
                                                "task",
                                                task.id
                                              );
                                            }}
                                            disabled={
                                              !task.id || isAnySuggestionLoading
                                            }
                                            loading={isSuggestionLoading(
                                              "task",
                                              task.id
                                            )}
                                          >
                                            任务执行建议
                                          </Button>
                                          <Button
                                            className="plans-task-action-button plans-task-action-button--edit"
                                            variant="filled"
                                            color="blue"
                                            leftSection={
                                              <IconPencil
                                                size={15}
                                                stroke={1.9}
                                              />
                                            }
                                            onClick={() =>
                                              openEditTaskModal(task)
                                            }
                                            disabled={!task.id}
                                          >
                                            编辑任务
                                          </Button>
                                          <Button
                                            className="plans-task-action-button plans-task-action-button--delete"
                                            variant="light"
                                            color="red"
                                            leftSection={
                                              <IconTrash
                                                size={15}
                                                stroke={1.9}
                                              />
                                            }
                                            onClick={() =>
                                              setTaskToDelete(task)
                                            }
                                            disabled={!task.id}
                                          >
                                            删除任务
                                          </Button>
                                        </Group>
                                      </div>
                                    </Paper>
                                  )}
                                </SortableTaskItem>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
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

      <PlanEditModal
        opened={isPlanModalOpen}
        onClose={closePlanModal}
        onSubmit={handleSavePlan}
        form={planForm}
        isSaving={isPlanSaving}
        onFieldChange={updatePlanField}
      />

      <ConfirmActionModal
        opened={isRegenerateModalOpen}
        onClose={() => {
          if (!isRegenerating) {
            setIsRegenerateModalOpen(false);
          }
        }}
        title="重新生成计划"
        content="重新生成后，当前计划中的阶段和任务安排可能会被新的 AI 结果覆盖，是否继续？"
        onConfirm={() => void handleRegeneratePlan()}
        confirmLabel={isRegenerating ? "重新生成中..." : "确认重新生成"}
        loading={isRegenerating}
      />

      <ConfirmActionModal
        opened={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingPlan) {
            setIsDeleteModalOpen(false);
          }
        }}
        title="删除计划"
        content="删除计划会将计划下的阶段和任务全部删除，是否删除？"
        onConfirm={() => void handleDeletePlan()}
        confirmLabel="删除计划"
        confirmColor="red"
        loading={isDeletingPlan}
      />

      <PhaseEditModal
        opened={isPhaseModalOpen}
        onClose={closePhaseModal}
        onSubmit={handleSavePhase}
        form={phaseForm}
        isLoading={isPhaseLoading}
        isSaving={isPhaseSaving}
        onFieldChange={updatePhaseField}
      />

      <TaskEditModal
        opened={isTaskModalOpen}
        onClose={closeTaskModal}
        onSubmit={handleSaveTask}
        mode={taskModalMode}
        form={taskForm}
        phases={phases}
        isSaving={isTaskSaving}
        onFieldChange={updateTaskField}
      />

      <ConfirmActionModal
        opened={Boolean(taskToDelete)}
        onClose={() => {
          if (!isTaskDeleting) {
            setTaskToDelete(null);
          }
        }}
        title="删除任务"
        content={`删除任务“${
          taskToDelete?.title ?? "未命名任务"
        }”后将无法恢复，是否删除？`}
        onConfirm={() => void handleDeleteTask()}
        confirmLabel="删除任务"
        confirmColor="red"
        loading={isTaskDeleting}
      />

      <NextSuggesModal
        opened={suggestionModalState.opened}
        onClose={closeSuggestionModal}
        title={suggestionModalState.title}
        emptyText={suggestionModalState.emptyText}
        suggestion={suggestionModalState.suggestion}
        onRegenerate={() => void handleRegenerateSuggestion()}
        isRegenerating={isSuggestionLoading(
          suggestionModalState.scope,
          suggestionModalState.entityId
        )}
      />
    </section>
  );
}
