import { db } from "./db";

export type Contribution = {
  id: string; name: string; lead: boolean;
  todo: number; doing: number; done: number; overdue: number;
  comments: number; commits: number; pullRequests: number;
  github: string | null;
  finished: { key: string; title: string; at: Date | null }[];
};

/**
 * Who did what on a student project: tasks from the board, comments, and GitHub commits and pull
 * requests. GitHub work is matched through the GitHub account each person connected in Ruvano.
 */
export async function contributions(project: { id: string; leadId: string | null }): Promise<Contribution[]> {
  const today = new Date().toISOString().slice(0, 10);
  const [members, issues, comments, dev] = await Promise.all([
    db.projectMember.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" }, select: { user: { select: { id: true, name: true, github: { select: { login: true } } } } } }),
    db.issue.findMany({ where: { projectId: project.id, type: { not: "EPIC" } }, select: { key: true, title: true, assigneeId: true, dueDate: true, resolvedAt: true, status: { select: { category: true } } }, orderBy: { resolvedAt: "asc" } }),
    db.comment.groupBy({ by: ["authorId"], where: { issue: { projectId: project.id } }, _count: true }),
    db.devActivity.findMany({ where: { issue: { projectId: project.id }, kind: { in: ["COMMIT", "PULL_REQUEST"] } }, select: { kind: true, externalId: true, author: true } }),
  ]);
  const commentsBy = Object.fromEntries(comments.map((c) => [c.authorId, c._count]));
  // A commit can mention two cards; count it once.
  const unique = [...new Map(dev.map((d) => [`${d.kind}:${d.externalId}`, d])).values()];
  return members.map(({ user }) => {
    const mine = issues.filter((i) => i.assigneeId === user.id);
    const login = user.github?.login?.toLowerCase() ?? null;
    const theirs = login ? unique.filter((d) => d.author.toLowerCase() === login) : [];
    return {
      id: user.id, name: user.name, lead: user.id === project.leadId,
      todo: mine.filter((i) => i.status.category === "TODO").length,
      doing: mine.filter((i) => i.status.category === "IN_PROGRESS").length,
      done: mine.filter((i) => i.status.category === "DONE").length,
      overdue: mine.filter((i) => i.status.category !== "DONE" && i.dueDate && i.dueDate.toISOString().slice(0, 10) < today).length,
      comments: commentsBy[user.id] ?? 0,
      commits: theirs.filter((d) => d.kind === "COMMIT").length,
      pullRequests: theirs.filter((d) => d.kind === "PULL_REQUEST").length,
      github: user.github?.login ?? null,
      finished: mine.filter((i) => i.status.category === "DONE").map((i) => ({ key: i.key, title: i.title, at: i.resolvedAt })),
    };
  }).sort((a, b) => b.done - a.done);
}
