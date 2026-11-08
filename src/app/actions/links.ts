"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { issueInWorkspace, requireEditor } from "@/lib/auth";
import { LINK_RELATIONS } from "@/lib/links";
import { visibleProjects } from "@/lib/permissions";

export async function addLink(issueId: string, relation: string, targetKey: string): Promise<{ error?: string }> {
  const user = await requireEditor();
  await issueInWorkspace(user, issueId);
  const rel = LINK_RELATIONS[relation as keyof typeof LINK_RELATIONS];
  if (!rel) return { error: "Pick a link type" };
  const target = await db.issue.findFirst({ where: { key: targetKey.trim().toUpperCase(), project: visibleProjects(user) } });
  if (!target) return { error: `No issue ${targetKey.trim().toUpperCase()}` };
  if (target.id === issueId) return { error: "An issue can't link to itself" };
  const [fromId, toId] = rel.outward ? [issueId, target.id] : [target.id, issueId];
  await db.issueLink.upsert({
    where: { fromId_toId_type: { fromId, toId, type: rel.type } },
    create: { fromId, toId, type: rel.type },
    update: {},
  });
  await db.activity.create({ data: { issueId, actorId: user.id, field: "link", to: `${relation} ${target.key}` } });
  revalidatePath("/", "layout");
  return {};
}

export async function removeLink(linkId: string) {
  const user = await requireEditor();
  await db.issueLink.deleteMany({ where: { id: linkId, from: { project: visibleProjects(user) } } });
  revalidatePath("/", "layout");
}
