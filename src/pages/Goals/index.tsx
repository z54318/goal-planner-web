import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  Button,
  Group,
  Modal,
  Pagination,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { GoalGoalStatus, goalsApi, plansApi } from "../../common/api";
import type {
  GoalCreateGoalRequest,
  GoalGoal,
  GoalUpdateGoalRequest,
  PlanPlan,
} from "../../common/api";
import { useAppMessage } from "../../common/message/AppMessageProvider";
import { ConfirmActionModal } from "../../common/components/ConfirmActionModal";
import {
  getGoalDisplayStatus,
  getGoalStatusLabel,
  goalStatusOptions,
} from "../../common/dicts";
import { formatDateTime } from "../../common/utils/date";
import "./index.css";

type GoalFormState = Required<
  Pick<
    GoalCreateGoalRequest,
    "title" | "description" | "category" | "target_deadline"
  >
>;
type GoalEditFormState = GoalUpdateGoalRequest;
type GoalStatusFormState = {
  status: GoalGoalStatus | "";
};
type GoalDetailTab = "basic" | "plan";

const GOALS_PAGE_SIZE = 6;

export function GoalsPage() {
  const [form, setForm] = useState<GoalFormState>({
    title: "",
    description: "",
    category: "",
    target_deadline: "",
  });
  const [editForm, setEditForm] = useState<GoalEditFormState>({
    title: "",
    description: "",
    category: "",
    target_deadline: "",
  });
  const [statusForm, setStatusForm] = useState<GoalStatusFormState>({
    status: "",
  });
  const [goalList, setGoalList] = useState<GoalGoal[]>([]);
  const [goalPage, setGoalPage] = useState(1);
  const [goalTotal, setGoalTotal] = useState(0);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<GoalGoal | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanPlan | null>(null);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [isPlanGenerating, setIsPlanGenerating] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [activeDetailTab, setActiveDetailTab] =
    useState<GoalDetailTab>("basic");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const message = useAppMessage();

  function updateField<Key extends keyof GoalFormState>(
    key: Key,
    value: GoalFormState[Key]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateEditField<Key extends keyof GoalEditFormState>(
    key: Key,
    value: GoalEditFormState[Key]
  ) {
    setEditForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function syncSelectedGoal(goal: GoalGoal | null) {
    setSelectedGoal(goal);
    setIsEditingGoal(false);
    setActiveDetailTab("basic");
    setEditForm({
      title: goal?.title ?? "",
      description: goal?.description ?? "",
      category: goal?.category ?? "",
      target_deadline: goal?.target_deadline ?? "",
    });
    setStatusForm({
      status: goal?.status ?? "",
    });
  }

  function isPlanNotFoundError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    return /计划不存在|暂无计划|not found|404|不存在/i.test(error.message);
  }

  function handleOpenCreateModal() {
    setForm({
      title: "",
      description: "",
      category: "",
      target_deadline: "",
    });
    setIsCreateModalOpen(true);
  }

  function handleCloseCreateModal() {
    setIsCreateModalOpen(false);
  }

  function handleStartGoalEdit() {
    syncSelectedGoal(selectedGoal);
    setIsEditingGoal(true);
  }

  function handleCancelGoalEdit() {
    syncSelectedGoal(selectedGoal);
  }

  function mergeGoalIntoList(goal: GoalGoal) {
    if (!goal.id) {
      return;
    }

    setGoalList((current) =>
      current.map((item) => (item.id === goal.id ? { ...item, ...goal } : item))
    );
  }

  async function loadGoalList(
    page = goalPage,
    nextSelectedId?: number | null
  ) {
    setIsListLoading(true);

    try {
      const response = await goalsApi.goalsList({
        page,
        pageSize: GOALS_PAGE_SIZE,
      });
      const nextData = response.data.data;
      const nextList = nextData?.list ?? [];
      const nextPage = nextData?.page ?? page;
      const nextTotal = nextData?.total ?? nextList.length;
      const preferredSelectedId = nextSelectedId ?? selectedGoalId;
      const resolvedSelectedId =
        preferredSelectedId && nextList.some((goal) => goal.id === preferredSelectedId)
          ? preferredSelectedId
          : nextList[0]?.id ?? null;

      setGoalList(nextList);
      setGoalPage(nextPage);
      setGoalTotal(nextTotal);
      setSelectedGoalId(resolvedSelectedId);

      if (resolvedSelectedId) {
        await loadGoalDetail(resolvedSelectedId);
      } else {
        syncSelectedGoal(null);
        setSelectedPlan(null);
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "获取目标列表失败。"
      );
    } finally {
      setIsListLoading(false);
    }
  }

  async function loadGoalDetail(goalId: number) {
    setIsDetailLoading(true);

    try {
      const response = await goalsApi.goalGet({
        id: goalId,
      });

      syncSelectedGoal(response.data.data ?? null);
      await loadGoalPlan(goalId);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "获取目标详情失败。"
      );
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function loadGoalPlan(goalId: number) {
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
          error instanceof Error ? error.message : "获取目标计划失败。"
        );
      }
    } finally {
      setIsPlanLoading(false);
    }
  }

  async function handleCreateGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await goalsApi.goalCreate({
        request: {
          title: form.title,
          description: form.description,
          category: form.category.trim() || undefined,
          target_deadline: form.target_deadline.trim() || undefined,
        },
      });

      const createdGoalId = response.data.data?.id ?? null;

      setForm({
        title: "",
        description: "",
        category: "",
        target_deadline: "",
      });

      await loadGoalList(1, createdGoalId);
      setIsCreateModalOpen(false);
      message.success("目标创建成功。");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "创建目标失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedGoalId) {
      return;
    }

    setIsUpdatingGoal(true);

    try {
      const response = await goalsApi.goalUpdate({
        id: selectedGoalId,
        request: {
          title: editForm.title?.trim() || undefined,
          description: editForm.description?.trim() || undefined,
          category: editForm.category?.trim() || undefined,
          target_deadline: editForm.target_deadline?.trim() || undefined,
        },
      });

      const updatedGoal = response.data.data ?? null;

      if (updatedGoal) {
        syncSelectedGoal(updatedGoal);
        mergeGoalIntoList(updatedGoal);
      } else {
        await loadGoalDetail(selectedGoalId);
      }

      message.success("目标信息已更新。");
      setIsEditingGoal(false);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "更新目标失败。");
    } finally {
      setIsUpdatingGoal(false);
    }
  }

  async function handleUpdateGoalStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedGoalId) {
      return;
    }

    const nextStatus = statusForm.status;
    const currentStatus = selectedGoal?.status ?? "";

    if (!nextStatus) {
      message.error("请输入目标状态。");
      return;
    }

    if (nextStatus === currentStatus) {
      message.warning("请先修改目标状态。");
      return;
    }

    setIsUpdatingStatus(true);

    try {
      const response = await goalsApi.goalUpdateStatus({
        id: selectedGoalId,
        request: {
          status: nextStatus,
        },
      });

      const updatedGoal = response.data.data ?? null;

      if (updatedGoal) {
        syncSelectedGoal(updatedGoal);
        mergeGoalIntoList(updatedGoal);
      } else {
        await loadGoalDetail(selectedGoalId);
      }

      message.success("目标状态已更新。");
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "更新目标状态失败。"
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleGenerateGoalPlan() {
    if (!selectedGoalId) {
      return;
    }

    setIsPlanGenerating(true);

    try {
      const response = selectedPlan
        ? await plansApi.goalPlanRegenerate({
            id: selectedGoalId,
          })
        : await plansApi.goalPlanGenerate({
            id: selectedGoalId,
          });

      const nextPlan = response.data.data ?? null;

      if (nextPlan) {
        setSelectedPlan(nextPlan);
      } else {
        await loadGoalPlan(selectedGoalId);
      }

      if (selectedPlan) {
        setIsRegenerateModalOpen(false);
      }

      message.success(
        selectedPlan ? "目标计划已重新生成。" : "目标计划已生成。"
      );
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : selectedPlan
          ? "重新生成目标计划失败。"
          : "生成目标计划失败。"
      );
    } finally {
      setIsPlanGenerating(false);
    }
  }

  function handlePlanActionClick() {
    if (!selectedPlan) {
      void handleGenerateGoalPlan();
      return;
    }

    setIsRegenerateModalOpen(true);
  }

  async function handleDeleteGoal() {
    if (!selectedGoalId || !selectedGoal) {
      return;
    }

    setIsDeletingGoal(true);

    try {
      await goalsApi.goalDelete({
        id: selectedGoalId,
      });

      const nextPage = goalList.length === 1 && goalPage > 1 ? goalPage - 1 : goalPage;

      await loadGoalList(nextPage);
      setIsDeleteModalOpen(false);
      message.success("目标已删除。");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "删除目标失败。");
    } finally {
      setIsDeletingGoal(false);
    }
  }

  useEffect(() => {
    void loadGoalList();
    // 初次加载目标列表即可。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmitStatusUpdate =
    Boolean(selectedGoalId) &&
    Boolean(statusForm.status) &&
    statusForm.status !== (selectedGoal?.status ?? "") &&
    !isUpdatingStatus &&
    !isDetailLoading;

  return (
    <>
      <section className="goals-shell">
        <div className="goals-column">
          <Paper className="goals-panel goals-list-panel" radius="xl" p="lg">
            <Group justify="space-between" className="goals-panel-header">
              <Title order={3}>目标列表</Title>
              <Button onClick={handleOpenCreateModal}>创建目标</Button>
            </Group>

            {goalList.length > 0 ? (
              <Stack className="goals-list" gap="sm">
                {goalList.map((goal) => {
                  const isActive = goal.id === selectedGoalId;

                  return (
                    <UnstyledButton
                      key={goal.id ?? goal.title}
                      className={`goals-list-item${
                        isActive ? " is-active" : ""
                      }`}
                      onClick={() => {
                        if (!goal.id) {
                          return;
                        }

                        setSelectedGoalId(goal.id);
                        void loadGoalDetail(goal.id);
                      }}
                    >
                      <Text fw={700}>{goal.title || "未命名目标"}</Text>
                      <Text size="sm" c="dimmed">
                        {getGoalStatusLabel(getGoalDisplayStatus(goal))}
                      </Text>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            ) : (
              <div className="goals-empty-state">
                <Text c="dimmed">
                  {isListLoading ? "目标加载中..." : "暂无目标"}
                </Text>
              </div>
            )}

            {goalTotal > GOALS_PAGE_SIZE ? (
              <Pagination
                className="goals-pagination"
                total={Math.ceil(goalTotal / GOALS_PAGE_SIZE)}
                value={goalPage}
                onChange={(page) => void loadGoalList(page)}
                disabled={isListLoading}
                siblings={1}
                boundaries={1}
              />
            ) : null}
          </Paper>
        </div>

        <Paper className="goals-panel goals-detail-panel" radius="xl" p="lg">
          <Group justify="space-between" className="goals-detail-header">
            <Title order={3}>目标详情</Title>
          </Group>

          {selectedGoal ? (
            <Tabs
              value={activeDetailTab}
              onChange={(value) =>
                setActiveDetailTab((value as GoalDetailTab) ?? "basic")
              }
            >
              <Tabs.List>
                <Tabs.Tab value="basic">基础信息</Tabs.Tab>
                <Tabs.Tab value="plan">目标计划</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="basic" pt="md">
                <div className="goal-detail">
                  <Group className="goal-detail-meta" gap="md" wrap="wrap">
                    <Paper
                      className="goal-detail-item"
                      radius="lg"
                      p="md"
                      withBorder
                    >
                      <Text size="sm" c="dimmed">
                        ID
                      </Text>
                      <Text fw={700}>{selectedGoal.id ?? "-"}</Text>
                    </Paper>
                    <Paper
                      className="goal-detail-item"
                      radius="lg"
                      p="md"
                      withBorder
                    >
                      <Text size="sm" c="dimmed">
                        创建时间
                      </Text>
                      <Text fw={700}>
                        {formatDateTime(selectedGoal.created_at)}
                      </Text>
                    </Paper>
                    <Paper
                      className="goal-detail-item"
                      radius="lg"
                      p="md"
                      withBorder
                    >
                      <Text size="sm" c="dimmed">
                        更新时间
                      </Text>
                      <Text fw={700}>
                        {formatDateTime(selectedGoal.updated_at)}
                      </Text>
                    </Paper>
                  </Group>

                  <form
                    className="goal-detail-form"
                    onSubmit={handleUpdateGoal}
                  >
                    <Stack gap="md">
                      <TextInput
                        label="标题"
                        value={editForm.title ?? ""}
                        onChange={(event) =>
                          updateEditField("title", event.currentTarget.value)
                        }
                        placeholder="请输入目标标题"
                        disabled={!isEditingGoal}
                      />

                      <Textarea
                        label="描述"
                        minRows={5}
                        value={editForm.description ?? ""}
                        onChange={(event) =>
                          updateEditField(
                            "description",
                            event.currentTarget.value
                          )
                        }
                        placeholder="请输入目标描述"
                        disabled={!isEditingGoal}
                      />

                      <div className="goal-detail-grid">
                        <TextInput
                          className="goals-field"
                          label="分类"
                          value={editForm.category ?? ""}
                          onChange={(event) =>
                            updateEditField(
                              "category",
                              event.currentTarget.value
                            )
                          }
                          placeholder="请输入目标分类"
                          disabled={!isEditingGoal}
                        />

                        <TextInput
                          className="goals-field"
                          label="目标截止时间"
                          value={
                            isEditingGoal
                              ? editForm.target_deadline ?? ""
                              : formatDateTime(editForm.target_deadline)
                          }
                          onChange={(event) =>
                            updateEditField(
                              "target_deadline",
                              event.currentTarget.value
                            )
                          }
                          placeholder="请输入截止时间"
                          disabled={!isEditingGoal}
                        />
                      </div>

                      <Group className="goal-detail-actions" justify="flex-end">
                        {isEditingGoal ? (
                          <>
                            <Button
                              variant="light"
                              color="gray"
                              onClick={handleCancelGoalEdit}
                              disabled={isUpdatingGoal}
                            >
                              取消编辑
                            </Button>
                            <Button
                              type="submit"
                              loading={isUpdatingGoal}
                              disabled={isDetailLoading}
                            >
                              {isUpdatingGoal ? "保存中..." : "保存目标"}
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={handleStartGoalEdit}
                            disabled={isDetailLoading}
                          >
                            编辑目标
                          </Button>
                        )}
                        <Button
                          color="red"
                          variant="light"
                          onClick={() => setIsDeleteModalOpen(true)}
                          disabled={isDetailLoading || isUpdatingGoal}
                        >
                          删除目标
                        </Button>
                      </Group>
                    </Stack>
                  </form>

                  <form
                    className="goal-status-form"
                    onSubmit={handleUpdateGoalStatus}
                  >
                    <Group align="end">
                      <Select
                        className="goals-field"
                        label="状态"
                        value={statusForm.status || null}
                        data={goalStatusOptions.map((status) => ({
                          value: status.value,
                          label: status.label,
                        }))}
                        onChange={(value) =>
                          setStatusForm({
                            status: (value ?? "") as GoalGoalStatus | "",
                          })
                        }
                      />

                      <Button
                        type="submit"
                        variant="light"
                        disabled={!canSubmitStatusUpdate}
                        loading={isUpdatingStatus}
                      >
                        {isUpdatingStatus ? "更新中..." : "更新状态"}
                      </Button>
                    </Group>
                  </form>
                </div>
              </Tabs.Panel>

              <Tabs.Panel value="plan" pt="md">
                <div className="goal-plan-panel">
                  <Group
                    justify="space-between"
                    className="goals-panel-header goal-plan-header"
                  >
                    <Title order={3}>目标计划</Title>
                    <Button
                      onClick={handlePlanActionClick}
                      disabled={!selectedGoalId || isDetailLoading || isPlanGenerating}
                      loading={isPlanGenerating}
                    >
                      {isPlanGenerating
                        ? "生成中..."
                        : selectedPlan
                        ? "重新生成计划"
                        : "生成计划"}
                    </Button>
                  </Group>

                  {selectedPlan ? (
                    <Stack className="goal-plan-detail" gap="md">
                      <Paper
                        className="goal-detail-item"
                        radius="lg"
                        p="md"
                        withBorder
                      >
                        <Text size="sm" c="dimmed">
                          计划标题
                        </Text>
                        <Text fw={700}>{selectedPlan.title || "-"}</Text>
                      </Paper>
                      <Paper
                        className="goal-detail-item"
                        radius="lg"
                        p="md"
                        withBorder
                      >
                        <Text size="sm" c="dimmed">
                          计划概述
                        </Text>
                        <Text>{selectedPlan.overview || "-"}</Text>
                      </Paper>
                      <div className="goal-detail-grid">
                        <Paper
                          className="goal-detail-item"
                          radius="lg"
                          p="md"
                          withBorder
                        >
                          <Text size="sm" c="dimmed">
                            计划ID
                          </Text>
                          <Text fw={700}>{selectedPlan.id ?? "-"}</Text>
                        </Paper>
                        <Paper
                          className="goal-detail-item"
                          radius="lg"
                          p="md"
                          withBorder
                        >
                          <Text size="sm" c="dimmed">
                            计划创建时间
                          </Text>
                          <Text fw={700}>
                            {formatDateTime(selectedPlan.created_at)}
                          </Text>
                        </Paper>
                      </div>
                    </Stack>
                  ) : (
                    <div className="goals-empty-state goals-plan-empty-state">
                      <Text c="dimmed">
                        {isPlanLoading
                          ? "计划加载中..."
                          : "当前目标还没有计划，点击上方按钮生成。"}
                      </Text>
                    </div>
                  )}
                </div>
              </Tabs.Panel>
            </Tabs>
          ) : (
            <div className="goals-empty-state">
              <Text c="dimmed">
                {isDetailLoading ? "详情加载中..." : "请选择目标"}
              </Text>
            </div>
          )}
        </Paper>
      </section>

      <ConfirmActionModal
        opened={isRegenerateModalOpen}
        onClose={() => {
          if (!isPlanGenerating) {
            setIsRegenerateModalOpen(false);
          }
        }}
        title="重新生成计划"
        content="重新生成后，当前目标下的计划内容可能会被新的 AI 结果覆盖，是否继续？"
        onConfirm={() => void handleGenerateGoalPlan()}
        confirmLabel={isPlanGenerating ? "重新生成中..." : "确认重新生成"}
        loading={isPlanGenerating}
      />

      <ConfirmActionModal
        opened={isDeleteModalOpen}
        onClose={() => {
          if (!isDeletingGoal) {
            setIsDeleteModalOpen(false);
          }
        }}
        title="删除目标"
        content="删除目标会将目标下的计划和任务全部删除，是否删除？"
        onConfirm={() => void handleDeleteGoal()}
        confirmLabel="删除目标"
        confirmColor="red"
        loading={isDeletingGoal}
      />

      <Modal
        opened={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="创建目标"
        centered
        radius="md"
      >
        <form className="goals-form" onSubmit={handleCreateGoal}>
          <Stack gap="md">
            <TextInput
              label="标题"
              value={form.title}
              onChange={(event) =>
                updateField("title", event.currentTarget.value)
              }
              placeholder="请输入目标标题"
              required
            />

            <Textarea
              label="描述"
              minRows={5}
              value={form.description}
              onChange={(event) =>
                updateField("description", event.currentTarget.value)
              }
              placeholder="请输入目标描述"
            />

            <TextInput
              label="分类"
              value={form.category}
              onChange={(event) =>
                updateField("category", event.currentTarget.value)
              }
              placeholder="请输入目标分类"
            />

            <TextInput
              label="目标截止时间"
              value={form.target_deadline}
              onChange={(event) =>
                updateField("target_deadline", event.currentTarget.value)
              }
              placeholder="请输入目标截止时间"
            />

            <Group justify="flex-end" className="goals-modal-actions">
              <Button
                variant="light"
                color="gray"
                onClick={handleCloseCreateModal}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? "创建中..." : "创建目标"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
