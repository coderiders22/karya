"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { projectInWorkspace, requireAdmin, requireEditor, requireUser } from "@/lib/auth";
import { aiRateLimited } from "@/lib/ai";
import { matchUntrackedToCard, standupSummary } from "@/lib/aiFeatures";
import { autoTransition, recordDev } from "@/lib/github";

const BUSY = "AI isn't available right now. Try again in a minute.";

/** AI's guess at which card a merged pull request with no card belongs to. Nothing changes until someone accepts it. */
export async function suggestCardForUntracked(id: string) {
  const user = await requireEditor();
  const row = await db.untrackedWork.findUniqueOrThrow({ where: { id } });
  await projectInWorkspace(user, row.projectId);
  if (aiRateLimited(user.id)) return { error: "That's a lot of AI requests. Try again in a while." };
  const match = await matchUntrackedToCard(id);
  if (!match) return { error: BUSY };
  return match;
}

/** Accepts a suggestion: the pull request goes on that card, and the card moves to done like any merged PR. */
export async function linkUntrackedToCard(id: string, issueId: string) {
  const user = await requireEditor();
  const row = await db.untrackedWork.findUniqueOrThrow({ where: { id } });
  await projectInWorkspace(user, row.projectId);
  const issue = await db.issue.findFirstOrThrow({
    where: { id: issueId, projectId: row.projectId },
    include: { status: true, project: { include: { statuses: { orderBy: { position: "asc" } } } } },
  });
  await recordDev(issue.id, "PULL_REQUEST", row.externalId, { title: row.title, url: row.url, state: "merged", author: row.author, repo: row.externalId.split("#")[0] });
  await autoTransition(issue, "done", `PR #${row.externalId.split("#")[1]} merged`);
  await db.untrackedWork.update({ where: { id }, data: { dismissed: true } });
  revalidatePath("/", "layout");
  return { key: issue.key };
}

/** A few sentences for team chat, written from the board and today's notes. */
export async function aiStandupSummary(projectId: string) {
  const user = await requireUser();
  const project = await projectInWorkspace(user, projectId);
  if (aiRateLimited(user.id)) return { error: "That's a lot of AI requests. Try again in a while." };
  const text = await standupSummary(project.id);
  return text ? { text } : { error: BUSY };
}

/** Workspace switch for every AI feature. */
export async function setWorkspaceAi(on: boolean) {
  const admin = await requireAdmin();
  await db.workspace.update({ where: { id: admin.workspaceId }, data: { aiEnabled: on } });
  revalidatePath("/", "layout");
}
