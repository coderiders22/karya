import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthForm";
import { JoinTeamButton } from "@/components/StudentProjects";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { templateById } from "@/lib/templates";

export const metadata = { title: "Join a team" };

/** Where a shared team link lands. Nothing joins on opening the page, so link previews in chat apps can't add anyone. */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const [me, project] = await Promise.all([
    getCurrentUser(),
    db.project.findUnique({
      where: { joinCode: code },
      select: { id: true, key: true, name: true, template: true, lead: { select: { name: true } }, _count: { select: { members: true } } },
    }),
  ]);
  if (!project) {
    return (
      <AuthCard title="This link no longer works" subtitle="Your team lead may have replaced it. Ask them for the new one." panel="student">
        <Link href={me ? "/your-work" : "/login"} className="btn-primary !h-10 w-full text-[14px]">{me ? "Go to Today" : "Log in"}</Link>
      </AuthCard>
    );
  }
  if (me && (await db.projectMember.findUnique({ where: { projectId_userId: { projectId: project.id, userId: me.id } } }))) {
    redirect(`/projects/${project.key}/board`);
  }
  const people = project._count.members;
  const subtitle = [
    project.lead && `${project.lead.name} invited you`,
    templateById(project.template)?.label,
    `${people} ${people === 1 ? "person" : "people"} so far`,
  ].filter(Boolean).join(" · ");
  return (
    <AuthCard title={`Join ${project.name}`} subtitle={subtitle} panel="student">
      {!me ? (
        <div className="space-y-2">
          <Link href={`/signup?join=${code}`} className="btn-primary !h-10 w-full text-[14px]">Create a free account</Link>
          <Link href={`/login?next=/join/${code}`} className="btn !h-10 w-full text-[14px]">I already have an account</Link>
        </div>
      ) : me.mode === "STUDENT" ? (
        <div className="space-y-3">
          <p className="text-[13px] text-muted">You're logged in as {me.name}.</p>
          <JoinTeamButton code={code} />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] text-muted">
            Team links are for student accounts, and {me.email} is a work account. Log out and create a student account with another email to join.
          </p>
          <Link href="/your-work" className="btn !h-10 w-full text-[14px]">Back to your work</Link>
        </div>
      )}
    </AuthCard>
  );
}
