import type { CSSProperties, ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconGripVertical } from "@tabler/icons-react";

type SortableTaskItemProps = {
  id: string;
  children: (dragHandle: ReactNode) => ReactNode;
};

export function SortableTaskItem({
  id,
  children,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : "auto",
  };

  const dragHandle = (
    <UnstyledButton
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="拖拽调整任务顺序"
      title="拖拽排序"
      className="plans-task-drag-handle"
      style={{
        cursor: "grab",
        touchAction: "none",
      }}
    >
      <span className="plans-task-drag-handle-content">
        <IconGripVertical size={16} stroke={1.9} />
        <span className="plans-task-drag-handle-label">拖拽排序</span>
      </span>
    </UnstyledButton>
  );

  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  );
}
