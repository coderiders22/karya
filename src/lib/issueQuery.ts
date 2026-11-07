import type { Prisma } from "@prisma/client";

export type IssueSearch = {
  q?: string; project?: string; type?: string; status?: string; cat?: string; assignee?: string;
  priority?: string; label?: string; sprint?: string; sort?: string; done?: string;
};

export const SORTS: Record<string, Prisma.IssueOrderByWithRelationInput> = {
  updated: { updatedAt: "desc" },
  created: { createdAt: "desc" },
  priority: { priority: "asc" },
  key: { number: "asc" },
  due: { dueDate: { sort: "asc", nulls: "last" } },
};

export function buildIssueWhere(sp: IssueSearch, meId: string, projectId?: string): Prisma.IssueWhereInput {
  const and: Prisma.IssueWhereInput[] = [];
  if (projectId) and.push({ projectId });
  else if (sp.project) and.push({ project: { key: sp.project } });
  if (sp.q) {
    and.push({
      OR: [
        { title: { contains: sp.q, mode: "insensitive" } },
        { key: { contains: sp.q, mode: "insensitive" } },
        { description: { contains: sp.q, mode: "insensitive" } },
      ],
    });
  }
  if (sp.type) and.push({ type: sp.type as never });
  if (sp.status) and.push({ statusId: sp.status });
  if (sp.cat) and.push({ status: { category: sp.cat as never } });
  if (sp.priority) and.push({ priority: sp.priority as never });
  if (sp.label) and.push({ labels: { has: sp.label } });
  if (sp.sprint === "none") and.push({ sprintId: null });
  else if (sp.sprint === "active") and.push({ sprint: { state: "ACTIVE" } });
  else if (sp.sprint) and.push({ sprintId: sp.sprint });
  if (sp.assignee === "me") and.push({ assigneeId: meId });
  else if (sp.assignee === "none") and.push({ assigneeId: null });
  else if (sp.assignee) and.push({ assigneeId: sp.assignee });
  if (sp.done !== "1" && !sp.status && !sp.cat) and.push({ status: { category: { not: "DONE" } } });
  return { AND: and };
}

export function toQueryString(sp: IssueSearch) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) p.set(k, v);
  return p.toString();
}
