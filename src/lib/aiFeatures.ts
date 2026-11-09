import { db } from "./db";
import { aiAvailable, aiChat } from "./ai";
import { realityCheck, REALITY_TITLES } from "./reality";

const DAY = 86400000;
const first = (name?: string | null) => name?.split(" ")[0] ?? "Unassigned";
const clip = (s: string, n = 120) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

const NO_INVENTING = "Use only the facts given. Never invent work, people, numbers or dates. Plain, friendly English. No markdown headings, no emoji.";

/** Which card a merged pull request with no card most likely belongs to. Only a key from the list counts. */
export async function matchUntrackedToCard(untrackedId: string) {
  const row = await db.untrackedWork.findUniqueOrThrow({ where: { id: untrackedId }, include: { project: { include: { workspace: { select: { aiEnabled: true } } } } } });
  if (!aiAvailable(row.project.workspace)) return null;
  const cards = await db.issue.findMany({
    where: { projectId: row.projectId, type: { not: "EPIC" }, OR: [{ status: { category: { not: "DONE" } } }, { resolvedAt: { gte: new Date(Date.now() - 14 * DAY) } }] },
    select: { id: true, key: true, title: true, status: { select: { name: true } } },
    orderBy: { statusChangedAt: "desc" },
    take: 80,
  });
  if (!cards.length) return null;
  const text = await aiChat({
    system: `You match a merged GitHub pull request to the tracker card it most likely completes. Answer with one line: the card key, a space, then why they match in at most 12 words (not the card's title). If no card is a clear match, answer exactly: NONE. ${NO_INVENTING}`,
    user: `Pull request: "${clip(row.title, 200)}" by ${row.author || "someone"}.\n\nCards:\n${cards.map((c) => `${c.key} | ${clip(c.title)} | ${c.status.name}`).join("\n")}`,
    maxTokens: 60,
    temperature: 0,
  });
  if (text === null) return null; // AI didn't answer: that's not the same as "no match"
  if (!text || /^NONE\b/i.test(text)) return { none: true as const };
  const key = text.match(/\b([A-Z][A-Z0-9]{1,9}-\d+)\b/)?.[1];
  const card = cards.find((c) => c.key === key);
  if (!card) return { none: true as const };
  let reason = text.slice(text.indexOf(key!) + key!.length).replace(/^[\s:,.–-]+/, "").trim();
  // A reason that only repeats the card's title adds nothing.
  if (!reason || card.title.toLowerCase().includes(reason.toLowerCase().replace(/[.]$/, ""))) reason = "";
  return { issueId: card.id, key: card.key, title: card.title, reason: clip(reason, 100) };
}

/** A few sentences for team chat, from the same facts the standup page shows. */
export async function standupSummary(projectId: string) {
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId }, include: { workspace: { select: { aiEnabled: true } } } });
  if (!aiAvailable(project.workspace)) return null;
  const since = new Date(Date.now() - (new Date().getDay() === 1 ? 3 : 1) * DAY);
  const day = new Date().toISOString().slice(0, 10);
  const [done, open, notes] = await Promise.all([
    db.issue.findMany({ where: { projectId, type: { not: "EPIC" }, resolvedAt: { gte: since } }, select: { key: true, title: true, assignee: { select: { name: true } } }, take: 40 }),
    db.issue.findMany({
      where: { projectId, type: { not: "EPIC" }, status: { category: "IN_PROGRESS" } },
      select: { key: true, title: true, assignee: { select: { name: true } }, linksIn: { where: { type: "BLOCKS" }, select: { from: { select: { status: { select: { category: true } } } } } } },
      take: 40,
    }),
    db.standupNote.findMany({ where: { projectId, day }, select: { text: true, blocker: true, user: { select: { name: true } } } }),
  ]);
  if (!done.length && !open.length && !notes.length) return "Nothing to summarise yet: no finished work, nothing in progress, and no notes today.";
  const blocked = open.filter((i) => i.linksIn.some((l) => l.from.status.category !== "DONE"));
  const facts = [
    `Finished since the last standup:\n${done.map((i) => `- ${i.key} ${clip(i.title)} (${first(i.assignee?.name)})`).join("\n") || "- nothing"}`,
    `In progress:\n${open.map((i) => `- ${i.key} ${clip(i.title)} (${first(i.assignee?.name)})`).join("\n") || "- nothing"}`,
    `Blocked:\n${blocked.map((i) => `- ${i.key} ${clip(i.title)}`).join("\n") || "- nothing"}`,
    `Notes people gave today:\n${notes.map((n) => `- ${first(n.user.name)}${n.blocker ? " (needs help)" : ""}: ${clip(n.text, 200)}`).join("\n") || "- none"}`,
  ].join("\n\n");
  return aiChat({
    system: `You write a daily standup summary for a software team's chat. 3 to 5 short sentences. Start with anyone who needs help or anything blocked, then what got done, then what's in progress. If anyone needs help, never say that nothing is blocked or blocking. Mention card keys like WR-12 when useful. ${NO_INVENTING}`,
    user: `Project: ${project.name}\n\n${facts}`,
    maxTokens: 260,
  });
}

/**
 * The "In short" paragraph on the public status page. Written in the background and kept for
 * six hours, so a shared link never waits on AI and can't run up calls.
 */
export async function refreshStatusSummary(projectId: string) {
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId }, include: { workspace: { select: { aiEnabled: true } } } });
  if (!aiAvailable(project.workspace)) return;
  if (project.aiSummaryAt && Date.now() - project.aiSummaryAt.getTime() < 6 * 3600_000) return;
  // Claim the slot first, so two visitors at once don't both call AI.
  const claimed = await db.project.updateMany({ where: { id: projectId, aiSummaryAt: project.aiSummaryAt }, data: { aiSummaryAt: new Date() } });
  if (!claimed.count) return;
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const [shipped, doing, reality, sprint] = await Promise.all([
    db.issue.findMany({ where: { projectId, type: { not: "EPIC" }, resolvedAt: { gte: weekAgo } }, select: { title: true }, take: 30 }),
    db.issue.findMany({ where: { projectId, type: { not: "EPIC" }, status: { category: "IN_PROGRESS" } }, select: { title: true }, take: 30 }),
    realityCheck(project),
    db.sprint.findFirst({ where: { projectId, state: "ACTIVE" }, select: { name: true, goal: true, endDate: true } }),
  ]);
  const facts = [
    sprint && `Current sprint: ${sprint.name}${sprint.goal ? `, goal: ${sprint.goal}` : ""}${sprint.endDate ? `, ends ${sprint.endDate.toDateString()}` : ""}`,
    project.dueAt && `Project deadline: ${project.dueAt.toDateString()}`,
    `Shipped in the last 7 days (${shipped.length}):\n${shipped.map((i) => `- ${clip(i.title)}`).join("\n") || "- nothing"}`,
    `In progress (${doing.length}):\n${doing.map((i) => `- ${clip(i.title)}`).join("\n") || "- nothing"}`,
    `Needs attention:\n${reality.filter((r) => r.kind !== "untracked").map((r) => `- ${REALITY_TITLES[r.kind]}: ${clip(r.title)}`).join("\n") || "- nothing"}`,
  ].filter(Boolean).join("\n\n");
  const text = await aiChat({
    system: `You write a short status update for a manager or client outside a software team. 2 to 4 sentences: what shipped, what's being worked on, and any risk. No card keys, no names. ${NO_INVENTING}`,
    user: `Project: ${project.name}\n\n${facts}`,
    maxTokens: 220,
  });
  // On failure keep the old summary, and let the next visit try again in an hour.
  await db.project.update({ where: { id: projectId }, data: text ? { aiSummary: text, aiSummaryAt: new Date() } : { aiSummaryAt: new Date(Date.now() - 5 * 3600_000) } });
}
