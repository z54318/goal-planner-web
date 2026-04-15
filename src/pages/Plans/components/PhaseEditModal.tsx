import type { FormEvent } from "react";
import { Button, Group, Modal, Stack, Text, TextInput, Textarea } from "@mantine/core";
import type { PhaseFormState } from "./formState";

type PhaseEditModalProps = {
  opened: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  form: PhaseFormState;
  isLoading: boolean;
  isSaving: boolean;
  onFieldChange: <Key extends keyof PhaseFormState>(
    key: Key,
    value: PhaseFormState[Key]
  ) => void;
};

export function PhaseEditModal({
  opened,
  onClose,
  onSubmit,
  form,
  isLoading,
  isSaving,
  onFieldChange,
}: PhaseEditModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="编辑阶段"
      centered
      radius="md"
    >
      {isLoading ? (
        <div className="plans-empty-inline">
          <Text c="dimmed">阶段详情加载中...</Text>
        </div>
      ) : (
        <form className="plans-phase-form" onSubmit={onSubmit}>
          <Stack gap="md">
            <TextInput
              label="阶段标题"
              value={form.title}
              onChange={(event) => onFieldChange("title", event.currentTarget.value)}
              placeholder="请输入阶段标题"
              required
            />

            <Textarea
              label="阶段描述"
              minRows={4}
              value={form.description}
              onChange={(event) =>
                onFieldChange("description", event.currentTarget.value)
              }
              placeholder="请输入阶段描述"
            />

            <TextInput
              label="排序值"
              value={form.sort_order}
              onChange={(event) =>
                onFieldChange("sort_order", event.currentTarget.value)
              }
              placeholder="例如：1"
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
                保存阶段
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}
