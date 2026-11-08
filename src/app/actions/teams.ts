"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PROJECT_COLORS } from "@/lib/constants";
import { requireEditor, requireProjectManager } from "@/lib/auth";
import { notifyLink } from "@/lib/notify";
import { keyFromName, templateById } from "@/lib/templates";

// No 0/O or 1/I/L: these get read out and typed from a phone.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

async function newJoinCode() {
  for (let i = 0; i < 8; i++) {
    const code = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    if (!(await db.project.findUnique({ where: { joinCode: code } }))) return code;
  }
  throw new Error("Couldn't create a team link. Try again.");
}

/**
 * Teams cross workspaces and pages find a project by its key, so two student projects must never
 * share one, or someone on both teams couldn't tell them apart. Someone else's SIH makes yours SIH2.
 */
async function freeProjectKey(name: string) {
  const base = keyFromName(name);
  const rows = await db.project.findMany({ where: { key: { startsWith: base }, workspace: { kind: "STUDENT" } }, select: { key: true } });
  const taken = new Set(rows.map((p) => p.key));
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}${n}`;
  return key;
}

/** Starts a project from a template: its columns, its steps, and due dates worked back from the deadline. */
export async function startProject(form: FormData): Promise<{ error?: string; key?: string; solo?: boolean }> {
  const me = await requireEditor();
  if (me.mode !== "STUDENT") return { error: "Project templates are for student accounts" };
  const template = templateById(String(form.get("template") ?? ""));
  if (!template) return { error: "Choose what you're working on" };
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: "Give it a name" };
  const rawDue = String(form.get("dueAt") ?? "");
  const dueAt = rawDue ? new Date(rawDue) : null;
  if (dueAt && (Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= Date.now())) return { error: "The deadline must be in the future" };

  const now = Date.now();
  const key = await freeProjectKey(name);
  const joinCode = await newJoinCode();
  const count = await db.project.count({ where: { workspaceId: me.workspaceId } });
  await db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        key, name, joinCode, template: template.id, dueAt,
        workspaceId: me.workspaceId, leadId: me.id,
        color: PROJECT_COLORS[count % PROJECT_COLORS.length],
        issueCounter: template.tasks.length,
        members: { create: { userId: me.id } },
        statuses: { create: template.columns.map(([columnName, category], position) => ({ name: columnName, category, position })) },
      },
      include: { statuses: { orderBy: { position: "asc" }, take: 1 } },
    });
    await tx.issue.createMany({
      data: template.tasks.map((task, i) => ({
        projectId: project.id,
        number: i + 1,
        key: `${key}-${i + 1}`,
        title: task.title,
        description: task.note ?? "",
        type: "TASK" as const,
        priority: task.priority ?? ("MEDIUM" as const),
        statusId: project.statuses[0].id,
        reporterId: me.id,
        rank: (i + 1) * 1000,
        // Issue due dates are whole days.
        dueDate: dueAt ? new Date(new Date(now + (dueAt.getTime() - now) * task.at).toISOString().slice(0, 10)) : null,
      })),
    });
  });
  revalidatePath("/", "layout");
  return { key, solo: template.solo };
}

export async function joinProject(code: string): Promise<{ error?: string }> {
  const me = await requireEditor();
  if (me.mode !== "STUDENT") return { error: "Team links are for student accounts" };
  const project = await db.project.findUnique({ where: { joinCode: code }, select: { id: true, key: true, name: true, leadId: true } });
  if (!project) return { error: "This team link no longer works. Ask your team lead for a new one." };
  await addToTeam(project, me);
  revalidatePath("/", "layout");
  redirect(`/projects/${project.key}/board`);
}

async function addToTeam(project: { id: string; key: string; name: string; leadId: string | null }, person: { id: string; name: string }) {
  const existing = await db.projectMember.findUnique({ where: { projectId_userId: { projectId: project.id, userId: person.id } } });
  if (existing) return;
  await db.projectMember.create({ data: { projectId: project.id, userId: person.id } });
  if (project.leadId) {
    await notifyLink({
      actorId: person.id, kind: "TEAM_JOINED", link: `/projects/${project.key}/team`,
      message: `${person.name} joined ${project.name}`, userIds: [project.leadId],
    });
  }
}

/** The old link stops working straight away. People already on the team stay on it. */
export async function resetTeamLink(projectId: string) {
  await requireProjectManager(projectId);
  await db.project.update({ where: { id: projectId }, data: { joinCode: await newJoinCode() } });
  revalidatePath("/", "layout");
}

/** Their finished work keeps their name. Unfinished work goes back to the team, and they stop getting alerts. */
async function dropFromTeam(projectId: string, userId: string) {
  await db.$transaction(async (tx) => {
    await tx.issue.updateMany({ where: { projectId, assigneeId: userId, status: { category: { not: "DONE" } } }, data: { assigneeId: null } });
    const watched = await tx.issue.findMany({ where: { projectId, watchers: { some: { id: userId } } }, select: { id: true } });
    await tx.user.update({ where: { id: userId }, data: { watching: { disconnect: watched } } });
    await tx.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });
  });
  revalidatePath("/", "layout");
}

export async function removeTeammate(projectId: string, userId: string): Promise<{ error?: string }> {
  const { project } = await requireProjectManager(projectId);
  if (userId === project.leadId) return { error: "Make someone else the lead first" };
  const owner = await db.user.count({ where: { id: userId, workspaceId: project.workspaceId } });
  if (owner) return { error: "The person who created this project can't be removed" };
  await dropFromTeam(projectId, userId);
  return {};
}

export async function leaveProject(projectId: string): Promise<{ error?: string }> {
  const me = await requireEditor();
  const project = await db.project.findFirstOrThrow({ where: { id: projectId, members: { some: { userId: me.id } } } });
  if (project.workspaceId === me.workspaceId) return { error: "You created this project, so you can't leave it. You can delete it from Settings." };
  if (project.leadId === me.id) return { error: "You're the lead. Make someone else the lead in Settings first." };
  await dropFromTeam(projectId, me.id);
  redirect("/your-work");
}
