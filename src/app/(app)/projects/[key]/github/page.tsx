import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getProjectByKey } from "@/lib/project";
import { GithubConnect } from "@/components/GithubConnect";
import { githubOAuthConfigured, openToken } from "@/lib/githubOAuth";
import { canManageProject } from "@/lib/permissions";

export const metadata = { title: "GitHub" };

export default async function GithubPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ github?: string }> }) {
  const me = await requireUser();
  const project = await getProjectByKey((await params).key);
  const status = (await searchParams).github ?? null;
  // Only counts as connected if the stored token still opens (AUTH_SECRET unchanged).
  const account = await db.githubAccount.findUnique({ where: { userId: me.id } });
  return (
    <main className="max-w-3xl p-4 sm:p-6">
      <GithubConnect
        projectId={project.id}
        projectKey={project.key}
        configured={githubOAuthConfigured()}
        repo={project.githubRepo}
        login={account && openToken(account.token) ? account.login : null}
        status={status}
        automation={project.gitAutomation}
        canManage={canManageProject(me, project)}
        lastEventAt={project.githubLastEventAt?.toISOString() ?? null}
        lastEventType={project.githubLastEventType}
        hasHook={!!project.githubHookId}
        issueSync={project.githubIssueSync}
      />
    </main>
  );
}
