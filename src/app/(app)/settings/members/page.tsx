import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Avatar } from "@/components/IssueBits";
import { InviteForm, MemberActions, RevokeInvite } from "@/components/MembersClient";
import { PageHeader } from "@/components/PageHeader";

export default async function MembersPage() {
  const me = await requireUser();
  const isAdmin = me.role === "ADMIN";
  const [users, invites] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { assigned: true } } } }),
    isAdmin ? db.invite.findMany({ where: { usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }) : [],
  ]);
  return (
    <main>
      <PageHeader title="Team" description={`${users.length} ${users.length === 1 ? "person" : "people"} in this workspace`} />
      <div className="max-w-3xl space-y-6 p-4 sm:p-6">
      {isAdmin && (
        <section className="card p-5">
          <h2 className="section-title mb-3">Invite people</h2>
          <InviteForm />
          {invites.length > 0 && (
            <ul className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center gap-2 py-2">
                  <span className="flex-1">{i.email ?? "Anyone with the link"} · {i.role.toLowerCase()}</span>
                  <span className="text-xs text-muted">expires {i.expiresAt.toLocaleDateString()}</span>
                  <RevokeInvite id={i.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <section className="card divide-y divide-slate-100 dark:divide-slate-800">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
            <Avatar name={u.name} size={8} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{u.name}</div>
              <div className="text-xs text-muted">{u.email} · {u._count.assigned} assigned</div>
            </div>
            {isAdmin ? <MemberActions userId={u.id} role={u.role} isSelf={u.id === me.id} /> : <span className="text-xs text-muted">{u.role.toLowerCase()}</span>}
          </div>
        ))}
      </section>
      </div>
    </main>
  );
}
