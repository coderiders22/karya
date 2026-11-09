"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { IssueType, Priority } from "@prisma/client";
import { db } from "@/lib/db";
import { syncIssueStateToGithub } from "@/lib/githubWrite";
import { issueInWorkspace, personOnProject, projectInWorkspace, requireEditor, requireUser } from "@/lib/auth";
import { canManageProject, visibleProjects } from "@/lib/permissions";
import { ISSUE_TYPES, PRIORITIES } from "@/lib/constants";
import { findMentions, notify, watch, watcherIds } from "@/lib/notify";

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1, "Summary is required").max(255),
  type: z.enum(["EPIC", "STORY", "TASK", "BUG", "SUBTASK"]).default("TASK"),
  priority: z.enum(["HIGHEST", "HIGH", "MEDIUM", "LOW", "LOWEST"]).default("MEDIUM"),
  description: z.string().optional().default(""),
  assigneeId: z.string().optional(),
  parentId: z.string().optional(),
  parentKey: z.string().optional(),
  sprintId: z.string().optional(),
  statusId: z.string().optional(),
  storyPoints: z.string().optional(),
  labels: z.string().optional(),
  dueDate: z.string().optional(),
  activeSprint: z.string().optional(),
});

export type CreateIssueResult = { error?: string; key?: string };

export async function createIssue(form: FormData): Promise<CreateIssueResult> {
  const user = await requireEditor();
  const parsed = createSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  // Everything the form points at has to be in this person's workspace and this project.
  await projectInWorkspace(user, d.projectId);
  if (d.assigneeId) await personOnProject(d.projectId, d.assigneeId);
  if (d.parentId && !(await db.issue.count({ where: { id: d.parentId, projectId: d.projectId } }))) return { error: "Parent issue not found" };
  if (d.sprintId && !(await db.sprint.count({ where: { id: d.sprintId, projectId: d.projectId } }))) return { error: "Sprint not found" };
  if (!d.parentId && d.parentKey?.trim()) {
    const parent = await db.issue.findFirst({
      where: { key: d.parentKey.trim().toUpperCase(), projectId: d.projectId },
    });
    if (!parent) return { error: `No issue ${d.parentKey.trim().toUpperCase()} in this project` };
    d.parentId = parent.id;
  }
  if (d.type === "SUBTASK" && !d.parentId) return { error: "A subtask needs a parent issue" };

  const issue = await db.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: d.projectId },
      data: { issueCounter: { increment: 1 } },
    });
    const status = d.statusId
      ? await tx.status.findFirstOrThrow({ where: { id: d.statusId, projectId: d.projectId } })
      : await tx.status.findFirstOrThrow({ where: { projectId: d.projectId }, orderBy: { position: "asc" } });
    const statusId = status.id;
    const sprintId = d.sprintId || (d.activeSprint ? (await tx.sprint.findFirst({ where: { projectId: d.projectId, state: "ACTIVE" } }))?.id : undefined);
    const maxRank = await tx.issue.aggregate({ where: { projectId: d.projectId }, _max: { rank: true } });
    return tx.issue.create({
      data: {
        projectId: d.projectId,
        number: project.issueCounter,
        key: `${project.key}-${project.issueCounter}`,
        title: d.title,
        type: d.type,
        priority: d.priority,
        description: d.description.replace(/\r\n?/g, "\n"),
        statusId,
        reporterId: user.id,
        assigneeId: d.assigneeId || null,
        parentId: d.parentId || null,
        sprintId: sprintId || null,
        dueDate: d.dueDate && !isNaN(new Date(d.dueDate).getTime()) ? new Date(d.dueDate) : null,
        startedAt: status.category === "TODO" ? null : new Date(),
        storyPoints: d.storyPoints ? Number(d.storyPoints) || null : null,
        labels: parseLabels(d.labels ?? ""),
        rank: (maxRank._max.rank ?? 0) + 1000,
        resolvedAt: status.category === "DONE" ? new Date() : null,
        watchers: { connect: [{ id: user.id }, ...(d.assigneeId ? [{ id: d.assigneeId }] : [])] },
        activities: { create: { actorId: user.id, field: "created" } },
      },
    });
  });
  await notify({ actorId: user.id, issueId: issue.id, kind: "ASSIGNED", userIds: [issue.assigneeId],
    message: `${user.name} assigned ${issue.key} to you: ${issue.title}` });
  const mentioned = await findMentions(issue.description, issue.projectId);
  await notify({ actorId: user.id, issueId: issue.id, kind: "MENTIONED", userIds: mentioned,
    message: `${user.name} mentioned you in ${issue.key}: ${issue.title}` });
  revalidatePath("/", "layout");
  return { key: issue.key };
}

function parseLabels(s: string) {
  return [...new Set(s.split(/[,\s]+/).map((l) => l.trim()).filter(Boolean))];
}

type Field =
  | "title"
  | "description"
  | "type"
  | "statusId"
  | "priority"
  | "assigneeId"
  | "storyPoints"
  | "dueDate"
  | "startDate"
  | "labels"
  | "parentId"
  | "sprintId";

/** Updates one field and records the change in the issue's history. */
export async function updateIssueField(issueId: string, field: Field, raw: string) {
  const user = await requireEditor();
  const issue = await db.issue.findFirstOrThrow({
    where: { id: issueId, project: visibleProjects(user) },
    include: { status: true, assignee: true, sprint: true, parent: true },
  });

  let data: Record<string, unknown>;
  let from: string | null = null;
  let to: string | null = null;
  const value = raw.trim();

  switch (field) {
    case "title":
      if (!value) return;
      data = { title: value };
      [from, to] = [issue.title, value];
      break;
    case "description":
      data = { description: raw.replace(/\r\n?/g, "\n") };
      [from, to] = [null, null];
      break;
    case "type":
      if (!ISSUE_TYPES.some((t) => t.value === value)) return;
      data = { type: value as IssueType };
      [from, to] = [issue.type, value];
      break;
    case "priority":
      if (!PRIORITIES.some((p) => p.value === value)) return;
      data = { priority: value as Priority };
      [from, to] = [issue.priority, value];
      break;
    case "statusId": {
      const status = await db.status.findFirstOrThrow({ where: { id: value, projectId: issue.projectId } });
      data = {
        statusId: status.id,
        statusChangedAt: new Date(),
        resolvedAt: status.category === "DONE" ? (issue.resolvedAt ?? new Date()) : null,
        ...(status.category !== "TODO" && !issue.startedAt && { startedAt: new Date() }),
      };
      [from, to] = [issue.status.name, status.name];
      break;
    }
    case "assigneeId": {
      const assignee = value ? await personOnProject(issue.projectId, value) : null;
      data = { assigneeId: assignee?.id ?? null };
      [from, to] = [issue.assignee?.name ?? "Unassigned", assignee?.name ?? "Unassigned"];
      break;
    }
    case "sprintId": {
      const sprint = value ? await db.sprint.findFirstOrThrow({ where: { id: value, projectId: issue.projectId } }) : null;
      data = { sprintId: sprint?.id ?? null };
      [from, to] = [issue.sprint?.name ?? "Backlog", sprint?.name ?? "Backlog"];
      break;
    }
    case "parentId": {
      const parent = value ? await db.issue.findFirstOrThrow({ where: { id: value, projectId: issue.projectId } }) : null;
      if (parent?.id === issue.id) return;
      data = { parentId: parent?.id ?? null };
      [from, to] = [issue.parent?.key ?? "None", parent?.key ?? "None"];
      break;
    }
    case "storyPoints": {
      const n = value === "" ? null : Number(value);
      if (n !== null && (!Number.isFinite(n) || n < 0)) return;
      data = { storyPoints: n === null ? null : Math.round(n) };
      [from, to] = [issue.storyPoints?.toString() ?? "None", n?.toString() ?? "None"];
      break;
    }
    case "startDate":
    case "dueDate": {
      const date = value ? new Date(value) : null;
      if (date && isNaN(date.getTime())) return;
      data = { [field]: date };
      [from, to] = [issue[field]?.toISOString().slice(0, 10) ?? "None", value || "None"];
      break;
    }
    case "labels": {
      const labels = parseLabels(value);
      data = { labels };
      [from, to] = [issue.labels.join(", ") || "None", labels.join(", ") || "None"];
      break;
    }
  }

  if (field !== "description" && from === to) return;
  await db.issue.update({
    where: { id: issueId },
    data: { ...data, activities: { create: { actorId: user.id, field, from, to } } },
  });
  if (field === "assigneeId" && value) {
    await watch(issueId, value);
    await notify({ actorId: user.id, issueId, kind: "ASSIGNED", userIds: [value],
      message: `${user.name} assigned ${issue.key} to you: ${issue.title}` });
  }
  if (field === "statusId") {
    const wasDone = issue.status.category === "DONE", nowDone = (data as { resolvedAt: Date | null }).resolvedAt !== null;
    if (wasDone !== nowDone) await syncIssueStateToGithub(issueId, nowDone, user.id);
    await notify({ actorId: user.id, issueId, kind: "STATUS_CHANGED", userIds: await watcherIds(issueId),
      message: `${user.name} moved ${issue.key} from ${from} to ${to}` });
  }
  if (field === "description") {
    const before = new Set(await findMentions(issue.description, issue.projectId));
    const now = (await findMentions(raw, issue.projectId)).filter((id) => !before.has(id));
    await notify({ actorId: user.id, issueId, kind: "MENTIONED", userIds: now,
      message: `${user.name} mentioned you in ${issue.key}: ${issue.title}` });
  }
  revalidatePath("/", "layout");
}

/** Board drag & drop: set the issue's status and re-rank the target column. */
export async function moveIssueOnBoard(issueId: string, statusId: string, orderedIds: string[]) {
  const user = await requireEditor();
  const issue = await db.issue.findFirstOrThrow({ where: { id: issueId, project: visibleProjects(user) }, include: { status: true } });
  const status = await db.status.findFirstOrThrow({ where: { id: statusId, projectId: issue.projectId } });
  const ranks = await db.issue.findMany({
    where: { id: { in: orderedIds }, projectId: issue.projectId },
    select: { id: true, rank: true },
    orderBy: { rank: "asc" },
  });
  // Reuse the column's existing rank values in the new order so other views stay stable.
  const sortedRanks = ranks.map((r) => r.rank).sort((a, b) => a - b);
  await db.$transaction([
    ...orderedIds
      .filter((id) => ranks.some((r) => r.id === id))
      .map((id, i) => db.issue.update({ where: { id }, data: { rank: sortedRanks[i] ?? i } })),
    db.issue.update({
      where: { id: issueId },
      data: {
        statusId,
        resolvedAt: status.category === "DONE" ? (issue.resolvedAt ?? new Date()) : null,
        ...(issue.statusId !== statusId && { statusChangedAt: new Date() }),
        ...(status.category !== "TODO" && !issue.startedAt && { startedAt: new Date() }),
        ...(issue.statusId !== statusId && {
          activities: { create: { actorId: user.id, field: "statusId", from: issue.status.name, to: status.name } },
        }),
      },
    }),
  ]);
  if (issue.statusId !== statusId) {
    if ((issue.status.category === "DONE") !== (status.category === "DONE")) await syncIssueStateToGithub(issueId, status.category === "DONE", user.id);
    await notify({ actorId: user.id, issueId, kind: "STATUS_CHANGED", userIds: await watcherIds(issueId),
      message: `${user.name} moved ${issue.key} from ${issue.status.name} to ${status.name}` });
  }
  revalidatePath("/", "layout");
}

export async function deleteIssue(issueId: string) {
  const user = await requireEditor();
  const issue = await issueInWorkspace(user, issueId);
  const project = await projectInWorkspace(user, issue.projectId);
  if (!canManageProject(user, project) && issue.reporterId !== user.id) throw new Error("Only the project's lead, a manager or the person who created it can delete this issue.");
  await db.issue.delete({ where: { id: issueId } });
  revalidatePath("/", "layout");
}

export async function addComment(issueId: string, body: string) {
  const user = await requireEditor();
  if (!body.trim()) return;
  const text = body.trim().replace(/\r\n?/g, "\n");
  const issue = await issueInWorkspace(user, issueId);
  await db.comment.create({ data: { issueId, authorId: user.id, body: text } });
  await watch(issueId, user.id);
  const mentioned = await findMentions(text, issue.projectId);
  await notify({ actorId: user.id, issueId, kind: "MENTIONED", userIds: mentioned,
    message: `${user.name} mentioned you on ${issue.key}: ${issue.title}` });
  const others = (await watcherIds(issueId)).filter((id) => id && !mentioned.includes(id));
  await notify({ actorId: user.id, issueId, kind: "COMMENTED", userIds: others,
    message: `${user.name} commented on ${issue.key}: ${issue.title}` });
  revalidatePath("/", "layout");
}

export async function deleteComment(commentId: string) {
  const user = await requireUser();
  const c = await db.comment.findFirstOrThrow({ where: { id: commentId, issue: { project: visibleProjects(user) } } });
  if (c.authorId !== user.id && user.role !== "ADMIN") throw new Error("You can only delete your own comments");
  await db.comment.delete({ where: { id: commentId } });
  revalidatePath("/", "layout");
}

/** Used by the ⌘K palette and parent pickers. */
export async function searchIssues(q: string, projectId?: string) {
  const user = await requireUser();
  const query = q.trim();
  return db.issue.findMany({
    where: {
      project: visibleProjects(user),
      ...(projectId && { projectId }),
      ...(query && {
        OR: [
          { key: { contains: query, mode: "insensitive" as const } },
          { title: { contains: query, mode: "insensitive" as const } },
        ],
      }),
    },
    select: { id: true, key: true, title: true, type: true },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });
}

export async function toggleWatch(issueId: string) {
  const user = await requireUser();
  await issueInWorkspace(user, issueId);
  const watching = await db.issue.count({ where: { id: issueId, watchers: { some: { id: user.id } } } });
  await db.issue.update({
    where: { id: issueId },
    data: { watchers: watching ? { disconnect: { id: user.id } } : { connect: { id: user.id } } },
  });
  revalidatePath("/", "layout");
}
