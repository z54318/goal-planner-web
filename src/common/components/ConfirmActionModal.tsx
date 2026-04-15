import type { ReactNode } from "react";
import type { ButtonProps } from "@mantine/core";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";

type ConfirmActionModalProps = {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  content: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel?: ReactNode;
  confirmColor?: ButtonProps["color"];
  cancelColor?: ButtonProps["color"];
  confirmVariant?: ButtonProps["variant"];
  cancelVariant?: ButtonProps["variant"];
  loading?: boolean;
};

export function ConfirmActionModal({
  opened,
  onClose,
  onConfirm,
  title,
  content,
  confirmLabel,
  cancelLabel = "取消",
  confirmColor = "blue",
  cancelColor = "gray",
  confirmVariant = "filled",
  cancelVariant = "light",
  loading = false,
}: ConfirmActionModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered radius="md">
      <Stack gap="md">
        <Text c="dimmed">{content}</Text>

        <Group justify="flex-end">
          <Button
            variant={cancelVariant}
            color={cancelColor}
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            color={confirmColor}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
