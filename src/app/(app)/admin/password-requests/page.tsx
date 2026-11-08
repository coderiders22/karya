import { notFound } from "next/navigation";
import { KeyRound } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/IssueBits";
import { PageHeader } from "@/components/PageHeader";
import { PasswordRequestItem, type PasswordRequestRow } from "@/components/PasswordRequests";

export const metadata = { title: "Password requests" };

const HOUR = 3600000;
const person = { select: { name: true, email: true, mode: true, workspace: { select: { name: true } } } };

function toRow(r: { id: string; createdAt: Date; linkCreatedAt: Date | null; user: { name: string; email: string; mode: string; workspace: { name: string } } }, label: string): PasswordRequestRow {
  const from = r.linkCreatedAt ?? r.createdAt;
  const hours = Math.floor((Date.now() - from.getTime()) / HOUR);
  const span = hours < 1 ? "under 1h" : hours < 48 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
  return { id: r.id, name: r.user.name, email: r.user.email, account: r.user.mode === "STUDENT" ? "Student" : r.user.workspace.name, waited: `${label} ${span}`, hours };
}

/**
 * The site owner's list of people who can't log in. A link from here opens any account, so this
 * page is for site owners only, and anyone else gets the same page as for an address that doesn't exist.
 */
export default async function PasswordRequestsPage() {
  const me = await requireUser();
  if (!me.siteOwner) notFound();
  const [waiting, linked] = await Promise.all([
    db.passwordResetRequest.findMany({ where: { resolvedAt: null, linkCreatedAt: null }, orderBy: { createdAt: "asc" }, include: { user: person } }),
    db.passwordResetRequest.findMany({
      where: { resolvedAt: null, linkCreatedAt: { gte: new Date(Date.now() - 14 * 24 * HOUR) } },
      orderBy: { linkCreatedAt: "desc" }, take: 30, include: { user: person },
    }),
  ]);
  return (
    <main>
      <PageHeader title="Password requests" description="People who can't log in. They were told to expect a link within 24 to 48 hours." />
      <div className="max-w-3xl space-y-6 p-4 sm:p-6">
        {waiting.length === 0 ? (
          <div className="card"><EmptyState icon={KeyRound} title="No requests waiting">New requests appear here and in your inbox.</EmptyState></div>
        ) : (
          <section>
            <h2 className="section-title mb-2">Waiting <span className="font-normal text-muted">· oldest first</span></h2>
            <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
              {waiting.map((r) => <PasswordRequestItem key={r.id} row={toRow(r, "Waiting")} />)}
            </ul>
            <p className="mt-2 text-xs text-muted">Send each link only to the email shown, even if someone asks for it another way. Anyone who has the link can take over the account.</p>
          </section>
        )}
        {linked.length > 0 && (
          <section>
            <h2 className="section-title mb-1">Link created</h2>
            <p className="mb-2 text-xs text-muted">They leave this list once they&apos;ve set a new password. A new link cancels the old one.</p>
            <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
              {linked.map((r) => <PasswordRequestItem key={r.id} sent row={toRow(r, "Created")} />)}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
