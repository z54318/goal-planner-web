import type { TaskTaskPriority } from "../../../common/api";
import { TaskTaskPriority as TaskPriorityEnum } from "../../../common/api";

export type PhaseFormState = {
  title: string;
  description: string;
  sort_order: string;
};

export const emptyPhaseForm: PhaseFormState = {
  title: "",
  description: "",
  sort_order: "",
};

export type PlanFormState = {
  title: string;
  overview: string;
};

export const emptyPlanForm: PlanFormState = {
  title: "",
  overview: "",
};

export type TaskModalMode = "create" | "edit";

export type PlanTaskFormState = {
  title: string;
  description: string;
  deliverables: string;
  deadline: string;
  estimated_days: string;
  priority: "" | TaskTaskPriority;
  sort_order: string;
  phase_id: string;
};

export const emptyTaskForm: PlanTaskFormState = {
  title: "",
  description: "",
  deliverables: "",
  deadline: "",
  estimated_days: "",
  priority: "",
  sort_order: "",
  phase_id: "",
};

export const taskPriorityOptions = [
  { value: TaskPriorityEnum.TaskPriorityHigh, label: "高" },
  { value: TaskPriorityEnum.TaskPriorityMedium, label: "中" },
  { value: TaskPriorityEnum.TaskPriorityLow, label: "低" },
];
