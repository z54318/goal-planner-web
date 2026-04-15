import type { FormEvent } from "react";
import { Button, Group, Modal, Stack, TextInput, Textarea } from "@mantine/core";
import type { PlanFormState } from "./formState";

type PlanEditModalProps = {
  opened: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  form: PlanFormState;
  isSaving: boolean;
  onFieldChange: <Key extends keyof PlanFormState>(
    key: Key,
    value: PlanFormState[Key]
  ) => void;
};

export function PlanEditModal({
  opened,
  onClose,
  onSubmit,
  form,
  isSaving,
  onFieldChange,
}: PlanEditModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="编辑计划"
      centered
      radius="md"
    >
      <form className="plans-phase-form" onSubmit={onSubmit}>
        <Stack gap="md">
          <TextInput
            label="计划标题"
            value={form.title}
            onChange={(event) => onFieldChange("title", event.currentTarget.value)}
            placeholder="请输入计划标题"
            required
          />

          <Textarea
            label="计划概述"
            minRows={5}
            value={form.overview}
            onChange={(event) => onFieldChange("overview", event.currentTarget.value)}
            placeholder="请输入计划概述"
          />

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
              保存计划
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
