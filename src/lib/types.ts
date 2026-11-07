import type { IssueType, Priority, StatusCategory } from "@prisma/client";

export type CardIssue = {
  id: string;
  projectId: string;
  key: string;
  title: string;
  type: IssueType;
  priority: Priority;
  statusId: string;
  labels: string[];
  storyPoints: number | null;
  assignee: { id: string; name: string } | null;
  parent: { key: string; title: string } | null;
  sprintId: string | null;
  status: { name: string; category: StatusCategory };
  statusChangedAt: string;
  dueDate: string | null;
  blocked: boolean;
};

export type StatusLite = { id: string; name: string; category: StatusCategory; wipLimit: number | null };
export type UserLite = { id: string; name: string };
