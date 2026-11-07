import type { IssueType, Priority, StatusCategory } from "@prisma/client";

export const ISSUE_TYPES: { value: IssueType; label: string; icon: string; color: string }[] = [
  { value: "EPIC", label: "Epic", icon: "", color: "" },
  { value: "STORY", label: "Story", icon: "", color: "" },
  { value: "TASK", label: "Task", icon: "", color: "" },
  { value: "BUG", label: "Bug", icon: "", color: "" },
  { value: "SUBTASK", label: "Subtask", icon: "", color: "" },
];

export const PRIORITIES: { value: Priority; label: string; icon: string; color: string }[] = [
  { value: "HIGHEST", label: "Highest", icon: "", color: "text-red-600" },
  { value: "HIGH", label: "High", icon: "", color: "text-orange-500" },
  { value: "MEDIUM", label: "Medium", icon: "", color: "text-amber-500" },
  { value: "LOW", label: "Low", icon: "", color: "text-sky-500" },
  { value: "LOWEST", label: "Lowest", icon: "", color: "text-sky-700" },
];

export const CATEGORY_STYLE: Record<StatusCategory, string> = {
  TODO: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DONE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export const DEFAULT_STATUSES: { name: string; category: StatusCategory }[] = [
  { name: "To Do", category: "TODO" },
  { name: "In Progress", category: "IN_PROGRESS" },
  { name: "In Review", category: "IN_PROGRESS" },
  { name: "Done", category: "DONE" },
];

export const typeMeta = (t: IssueType) => ISSUE_TYPES.find((x) => x.value === t)!;
export const priorityMeta = (p: Priority) => PRIORITIES.find((x) => x.value === p)!;

export const PROJECT_COLORS = ["#0e7c66", "#2563eb", "#9333ea", "#c2410c", "#be185d", "#4d7c0f", "#0369a1", "#a16207", "#57544e"];
