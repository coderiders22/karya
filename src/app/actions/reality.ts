"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projectInWorkspace, personOnProject, requireEditor, requireProjectManager } from "@/lib/auth";
import { recordDev } from "@/lib/github";
import { appUrl } from "@/lib/appUrl";

async function untrackedFor(id: string) {
  const user = await requireEditor();
  const row = await db.untrackedWork.findUniqueOrThrow({ where: { id } });
  const project = await projectInWorkspace(user, row.projectId);
  return { user, row, project };
}

/** A merged pull request with no card gets one, already done, so the work is on record. */
export async function trackUntrackedWork(id: string) {
  const { user, row, project } = await untrackedFor(id);
  const done = await db.status.findFirst({ where: { projectId: project.id, category: "DONE" }, orderBy: { position: "asc" } });
  if (!done) return { error: "This project has no Done column." };
  const now = new Date();
  const issue = await db.$transaction(async (tx) => {
    const counted = await tx.project.update({ where: { id: project.id }, data: { issueCounter: { increment: 1 } } });
    const top = await tx.issue.aggregate({ where: { projectId: project.id }, _max: { rank: true } });
    return tx.issue.create({
      data: {
        projectId: project.id, number: counted.issueCounter, key: `${counted.key}-${counted.issueCounter}`,
        title: row.title || "Untitled pull request", statusId: done.id, reporterId: user.id,
        resolvedAt: row.mergedAt, startedAt: row.mergedAt, statusChangedAt: now, rank: (top._max.rank ?? 0) + 1000,
        activities: { create: { actorId: user.id, field: "created" } },
      },
    });
  });
  await recordDev(issue.id, "PULL_REQUEST", row.externalId, { title: row.title, url: row.url, state: "merged", author: row.author, repo: row.externalId.split("#")[0] });
  await db.untrackedWork.update({ where: { id }, data: { dismissed: true } });
  revalidatePath("/", "layout");
  return { key: issue.key };
}

export async function dismissUntrackedWork(id: string) {
  await untrackedFor(id);
  await db.untrackedWork.update({ where: { id }, data: { dismissed: true } });
  revalidatePath("/", "layout");
}

/** Today's standup note for one person. Empty text and no blocker removes it. */
export async function saveStandupNote(projectId: string, userId: string, day: string, text: string, blocker: boolean) {
  const user = await requireEditor();
  const project = await projectInWorkspace(user, projectId);
  await personOnProject(project.id, userId);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  const clean = text.replace(/\r\n?/g, "\n").slice(0, 2000);
  const where = { projectId_userId_day: { projectId: project.id, userId, day } };
  if (!clean.trim() && !blocker) {
    await db.standupNote.deleteMany({ where: { projectId: project.id, userId, day } });
  } else {
    await db.standupNote.upsert({ where, create: { projectId: project.id, userId, day, text: clean, blocker }, update: { text: clean, blocker } });
  }
  revalidatePath(`/projects/${project.key}/standup`);
}

/** Turns the read-only status link on (a new secret each time) or off. */
export async function setStatusLink(projectId: string, on: boolean) {
  const { project } = await requireProjectManager(projectId);
  const statusToken = on ? randomBytes(18).toString("base64url") : null;
  await db.project.update({ where: { id: project.id }, data: { statusToken } });
  revalidatePath(`/projects/${project.key}/standup`);
  return statusToken ? `${appUrl()}/status/${statusToken}` : null;
}
