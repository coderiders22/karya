import { notFound } from "next/navigation";
import { Check, Minus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL, ROLE_MATRIX } from "@/lib/permissions";
import { Avatar } from "@/components/IssueBits";
import { AiSetting, InviteForm, MemberActions, RevokeInvite, WorkspaceName } from "@/components/MembersClient";
import { aiConfigured } from "@/lib/ai";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Team" };

export default async function MembersPage() {
  const me = await requireUser();
  const isAdmin = me.role === "ADMIN";
  // A student's workspace is theirs alone. Teammates are per project, on each project's Team page.
  if (me.mode === "STUDENT") notFound();
  const [users, invites, workspace] = await Promise.all([
    db.user.findMany({ where: { workspaceId: me.workspaceId }, orderBy: { createdAt: "asc" }, include: { _count: { select: { assigned: true } } } }),
    isAdmin ? db.invite.findMany({ where: { workspaceId: me.workspaceId, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }) : [],
    db.workspace.findUniqueOrThrow({ where: { id: me.workspaceId }, select: { aiEnabled: true } }),
  ]);
  return (
    <main>
      <PageHeader title="Team" description={`${users.length} ${users.length === 1 ? "person" : "people"} in ${me.workspace.name}`} />
      <div className="max-w-3xl space-y-6 p-4 sm:p-6">
        {isAdmin && (
          <section className="card space-y-5 p-5">
            <div>
              <h2 className="section-title mb-3">Invite people</h2>
              <InviteForm />
              {invites.length > 0 && (
                <ul className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                  {invites.map((i) => (
                    <li key={i.id} className="flex items-center gap-2 py-2">
                      <span className="min-w-0 flex-1 truncate">{i.email ?? "Anyone with the link"} · {ROLE_LABEL[i.role].toLowerCase()}</span>
                      <span className="text-xs text-muted">expires {i.expiresAt.toISOString().slice(0, 10)}</span>
                      <RevokeInvite id={i.id} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800"><WorkspaceName name={me.workspace.name} /></div>
            {aiConfigured() && <div className="border-t border-slate-100 pt-4 dark:border-slate-800"><AiSetting on={workspace.aiEnabled} /></div>}
          </section>
        )}
        <section className="card divide-y divide-slate-100 dark:divide-slate-800">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <Avatar name={u.name} size={8} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{u.name}</div>
                <div className="truncate text-xs text-muted">{u.email} · {u._count.assigned} assigned</div>
              </div>
              {isAdmin
                ? <MemberActions userId={u.id} role={u.role} isSelf={u.id === me.id} />
                : <span className="text-xs text-muted">{ROLE_LABEL[u.role]}</span>}
            </div>
          ))}
        </section>
        <section>
            <h2 className="section-title mb-2">What each role can do</h2>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[34rem] text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-muted dark:border-slate-800">
                    <th scope="col" className="px-3 py-2 text-left font-medium"><span className="sr-only">Permission</span></th>
                    {(["VIEWER", "MEMBER", "MANAGER", "ADMIN"] as const).map((r) => <th key={r} scope="col" className="w-20 px-2 py-2 font-medium">{ROLE_LABEL[r]}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ROLE_MATRIX.map((row) => (
                    <tr key={row.label}>
                      <th scope="row" className="px-3 py-2 text-left font-normal">{row.label}</th>
                      {[row.viewer, row.member, row.manager, row.admin].map((yes, i) => (
                        <td key={i} className="px-2 py-2 text-center">
                          {yes ? <Check size={14} className="mx-auto text-brand" aria-label="Yes" /> : <Minus size={14} className="mx-auto text-slate-300 dark:text-slate-600" aria-label="No" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted">Whoever leads a project can manage that project, even as a Member.</p>
        </section>
      </div>
    </main>
  );
}
