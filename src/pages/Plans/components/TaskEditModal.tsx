import type { FormEvent } from "react";
import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconCalendarEvent } from "@tabler/icons-react";
import type { PlanPhase } from "../../../common/api";
import type { PlanTaskFormState, TaskModalMode } from "./formState";
import { taskPriorityOptions } from "./formState";

type TaskEditModalProps = {
  opened: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  mode: TaskModalMode;
  form: PlanTaskFormState;
  phases: PlanPhase[];
  isSaving: boolean;
  onFieldChange: <Key extends keyof PlanTaskFormState>(
    key: Key,
    value: PlanTaskFormState[Key]
  ) => void;
};

export function TaskEditModal({
  opened,
  onClose,
  onSubmit,
  mode,
  form,
  phases,
  isSaving,
  onFieldChange,
}: TaskEditModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === "create" ? "新增任务" : "编辑任务"}
      centered
      radius="md"
      size={920}
      classNames={{
        body: "plans-task-modal-body",
      }}
    >
      <form className="plans-phase-form" onSubmit={onSubmit}>
        <Stack gap="md">
          <TextInput
            label="任务标题"
            size="md"
            value={form.title}
            onChange={(event) => onFieldChange("title", event.currentTarget.value)}
            placeholder="请输入任务标题"
            required
          />

          <Textarea
            label="任务描述"
            size="md"
            minRows={4}
            value={form.description}
            onChange={(event) =>
              onFieldChange("description", event.currentTarget.value)
            }
            placeholder="请输入任务描述"
          />

          <Textarea
            label="预期产出"
            size="md"
            minRows={3}
            value={form.deliverables}
            onChange={(event) =>
              onFieldChange("deliverables", event.currentTarget.value)
            }
            placeholder="请输入这项任务完成后要产出的结果"
          />

          <Select
            label="所属阶段"
            size="md"
            value={form.phase_id || null}
            data={phases
              .filter((phase) => phase.id)
              .map((phase) => ({
                value: String(phase.id),
                label: phase.title || `阶段 ${phase.id}`,
              }))}
            onChange={(value) => onFieldChange("phase_id", value ?? "")}
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
                value={form.deadline}
                onChange={(event) =>
                  onFieldChange("deadline", event.currentTarget.value)
                }
              />
            </div>

            <TextInput
              label="预计天数"
              size="md"
              value={form.estimated_days}
              onChange={(event) =>
                onFieldChange("estimated_days", event.currentTarget.value)
              }
              placeholder="例如：3"
            />

            <Select
              label="优先级"
              size="md"
              value={form.priority || null}
              data={taskPriorityOptions}
              clearable
              onChange={(value) =>
                onFieldChange(
                  "priority",
                  (value ?? "") as PlanTaskFormState["priority"]
                )
              }
            />

            <TextInput
              label="排序值"
              size="md"
              value={form.sort_order}
              onChange={(event) =>
                onFieldChange("sort_order", event.currentTarget.value)
              }
              placeholder="例如：1"
            />
          </div>

          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              onClick={onClose}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button type="submit" loading={isSaving}>
              {mode === "create" ? "创建任务" : "保存任务"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
