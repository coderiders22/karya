import { db } from "./db";
import { gh, openToken } from "./githubOAuth";

/** Someone whose GitHub authorisation can write to the project's repository: the person acting, the lead, then anyone else on it. */
async function writerToken(project: { workspaceId: string; leadId: string | null }, actorId?: string) {
  const preferred = [actorId, project.leadId].filter((id): id is string => !!id);
  for (const userId of preferred) {
    const acct = await db.githubAccount.findUnique({ where: { userId } });
    const token = acct && openToken(acct.token);
    if (token) return token;
  }
  const others = await db.githubAccount.findMany({ where: { user: { workspaceId: project.workspaceId } }, orderBy: { updatedAt: "desc" }, take: 5 });
  for (const acct of others) {
    const token = openToken(acct.token);
    if (token) return token;
  }
  return null;
}

/**
 * Keeps a GitHub issue in step with its card: closed when the card reaches Done, reopened when it
 * leaves Done. Only for cards that came from GitHub, and only when the project has it switched on.
 * Never throws: a GitHub hiccup must not stop someone moving a card.
 */
export async function syncIssueStateToGithub(issueId: string, done: boolean, actorId?: string) {
  try {
    const issue = await db.issue.findUnique({
      where: { id: issueId },
      select: { githubNumber: true, project: { select: { githubRepo: true, githubCloseOnDone: true, workspaceId: true, leadId: true } } },
    });
    const repo = issue?.project.githubRepo;
    if (!issue?.githubNumber || !repo || !issue.project.githubCloseOnDone) return;
    const token = await writerToken(issue.project, actorId);
    if (!token) return;
    await gh(token, `/repos/${repo}/issues/${issue.githubNumber}`, {
      method: "PATCH",
      body: done ? { state: "closed", state_reason: "completed" } : { state: "open" },
    });
    // Remember it here too, so GitHub's own "closed" event doesn't read as news.
    await db.devActivity.updateMany({ where: { issueId, kind: "ISSUE" }, data: { state: done ? "closed" : "open" } });
  } catch (e) {
    console.error("Couldn't update the GitHub issue", e instanceof Error ? e.message : e);
  }
}
