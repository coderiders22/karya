import { db } from "./db";

/**
 * Reality Check: where the board and the code disagree. Every finding comes from facts Ruvano has
 * seen (cards, dates, GitHub events), never a guess, and links to what proves it.
 */
import type { RealityItem, RealityKind } from "./realityShared";

export { REALITY_TITLES, type RealityItem, type RealityKind } from "./realityShared";

const DAY = 86400000;
const days = (from: Date, now: number) => Math.max(0, Math.floor((now - from.getTime()) / DAY));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export async function realityCheck(project: { id: string; staleDays: number; githubRepo: string | null }): Promise<RealityItem[]> {
  const now = Date.now();
  const github = !!project.githubRepo;
  const quietSince = new Date(now - project.staleDays * DAY);
  const [open, recentlyDone, untracked] = await Promise.all([
    db.issue.findMany({
      where: { projectId: project.id, type: { not: "EPIC" }, status: { category: { not: "DONE" } } },
      select: {
        id: true, key: true, title: true, dueDate: true, statusChangedAt: true,
        status: { select: { name: true, category: true } }, assignee: { select: { name: true } },
        devActivity: { where: { kind: { in: ["BRANCH", "COMMIT", "PULL_REQUEST"] } }, select: { kind: true, state: true, updatedAt: true, url: true } },
      },
    }),
    github ? db.issue.findMany({
      where: { projectId: project.id, status: { category: "DONE" }, resolvedAt: { gte: new Date(now - 30 * DAY) }, devActivity: { some: { kind: "PULL_REQUEST", state: { in: ["open", "draft"] } } } },
      select: { id: true, key: true, title: true, assignee: { select: { name: true } }, devActivity: { where: { kind: "PULL_REQUEST", state: { in: ["open", "draft"] } }, select: { externalId: true } } },
    }) : [],
    github ? db.untrackedWork.findMany({ where: { projectId: project.id, dismissed: false, mergedAt: { gte: new Date(now - 14 * DAY) } }, orderBy: { mergedAt: "desc" }, take: 20 }) : [],
  ]);

  const items: RealityItem[] = [];
  const card = (i: { id: string; key: string; title: string; assignee: { name: string } | null }) =>
    ({ id: i.id, label: i.key, title: i.title, href: `/issues/${i.key}`, assignee: i.assignee?.name ?? null });

  for (const i of recentlyDone) {
    const prs = i.devActivity.map((d) => d.externalId.split("#")[1]).filter(Boolean);
    items.push({ kind: "done-pr-open", ...card(i), detail: `Marked done, but pull request ${prs.map((n) => `#${n}`).join(", ")} is still open.` });
  }

  for (const i of open) {
    const code = i.devActivity;
    if (github && i.status.category === "IN_PROGRESS" && i.statusChangedAt < quietSince) {
      const last = code.reduce<Date | null>((a, d) => (!a || d.updatedAt > a ? d.updatedAt : a), null);
      if (!last || last < quietSince) {
        items.push({ kind: "quiet", ...card(i), detail: last
          ? `${i.status.name} for ${plural(days(i.statusChangedAt, now), "day")}. Last commit or pull request ${plural(days(last, now), "day")} ago.`
          : `${i.status.name} for ${plural(days(i.statusChangedAt, now), "day")}, with no branch, commit or pull request yet.` });
        continue;
      }
    }
    const waiting = code.filter((d) => d.kind === "PULL_REQUEST" && d.state === "open" && now - d.updatedAt.getTime() > 2 * DAY);
    if (waiting.length) {
      const oldest = waiting.reduce((a, d) => (d.updatedAt < a ? d.updatedAt : a), waiting[0].updatedAt);
      items.push({ kind: "pr-waiting", ...card(i), detail: `Its pull request has had no update for ${plural(days(oldest, now), "day")}. It may need a reviewer.` });
      continue;
    }
    if (i.dueDate && i.status.category === "TODO" && i.dueDate.getTime() - now < 2 * DAY) {
      const left = Math.ceil((i.dueDate.getTime() - now) / DAY);
      items.push({ kind: "due-not-started", ...card(i), detail: left < 0 ? `Overdue by ${plural(-left, "day")} and not started.` : left === 0 ? "Due today and not started." : `Due in ${plural(left, "day")} and not started.` });
    }
  }

  for (const u of untracked) {
    items.push({
      kind: "untracked", id: u.id, label: `#${u.externalId.split("#")[1]}`, title: u.title, href: u.url, external: true,
      detail: `Merged ${days(u.mergedAt, now) === 0 ? "today" : `${plural(days(u.mergedAt, now), "day")} ago`}${u.author ? ` by ${u.author}` : ""}, with no card on the board.`,
    });
  }

  const order: RealityKind[] = ["done-pr-open", "quiet", "pr-waiting", "untracked", "due-not-started"];
  return items.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}
