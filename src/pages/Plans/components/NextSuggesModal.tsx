import type { ReactNode } from "react";
import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconChecklist,
  IconAlertTriangle,
  IconArrowRight,
  IconBulb,
} from "@tabler/icons-react";
import type {
  PhaseNextStepSuggestion,
  PlanNextStepSuggestion,
  TaskNextStepSuggestion,
} from "../../../common/api";

type ExecutionSuggestion =
  | PlanNextStepSuggestion
  | PhaseNextStepSuggestion
  | TaskNextStepSuggestion;

type NextSuggestionModalProps = {
  opened: boolean;
  onClose: () => void;
  title: string;
  emptyText: string;
  suggestion: ExecutionSuggestion | null;
  onRegenerate: () => void;
  isRegenerating: boolean;
};

type SuggestionSectionProps = {
  icon: ReactNode;
  label: string;
  value?: string;
};

function SuggestionSection({ icon, label, value }: SuggestionSectionProps) {
  if (!value?.trim()) {
    return null;
  }

  return (
    <Stack gap={8}>
      <Badge
        variant="light"
        color="blue"
        size="lg"
        leftSection={icon}
        styles={{
          root: {
            alignSelf: "flex-start",
          },
        }}
      >
        {label}
      </Badge>
      <Text size="sm" c="dimmed" lh={1.8}>
        {value}
      </Text>
    </Stack>
  );
}

export function NextSuggesModal({
  opened,
  onClose,
  title,
  emptyText,
  suggestion,
  onRegenerate,
  isRegenerating,
}: NextSuggestionModalProps) {
  const checklist = suggestion?.checklist?.filter((item) => item.trim()) ?? [];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      radius="md"
      size={760}
    >
      {suggestion ? (
        <Stack gap="lg">
          <SuggestionSection
            icon={<IconBulb size={14} stroke={1.8} />}
            label="建议摘要"
            value={suggestion.summary}
          />

          <SuggestionSection
            icon={<IconArrowRight size={14} stroke={1.8} />}
            label="执行动作"
            value={suggestion.next_action}
          />

          <SuggestionSection
            icon={<IconBulb size={14} stroke={1.8} />}
            label="建议原因"
            value={suggestion.reason}
          />

          {checklist.length > 0 ? (
            <Stack gap="sm">
              <Badge
                variant="light"
                color="blue"
                size="lg"
                leftSection={<IconChecklist size={14} stroke={1.8} />}
                styles={{
                  root: {
                    alignSelf: "flex-start",
                  },
                }}
              >
                执行清单
              </Badge>

              <Stack gap="xs">
                {checklist.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <ThemeIcon
                      size={22}
                      radius="xl"
                      color="blue"
                      variant="light"
                      mt={2}
                    >
                      <IconChecklist size={14} stroke={2} />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed" lh={1.8}>
                      {item}
                    </Text>
                  </div>
                ))}
              </Stack>
            </Stack>
          ) : null}

          {suggestion.risk?.trim() ? (
            <>
              <Divider />
              <SuggestionSection
                icon={<IconAlertTriangle size={14} stroke={1.8} />}
                label="主要风险"
                value={suggestion.risk}
              />
            </>
          ) : null}

          <Group justify="flex-end">
            <Button variant="light" color="gray" onClick={onClose}>
              关闭
            </Button>
            <Button onClick={onRegenerate} loading={isRegenerating}>
              {isRegenerating ? "重新生成中..." : "重新生成建议"}
            </Button>
          </Group>
        </Stack>
      ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {emptyText}
          </Text>
          <Group justify="flex-end">
            <Button variant="light" color="gray" onClick={onClose}>
              关闭
            </Button>
            <Button onClick={onRegenerate} loading={isRegenerating}>
              {isRegenerating ? "生成中..." : "生成建议"}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
