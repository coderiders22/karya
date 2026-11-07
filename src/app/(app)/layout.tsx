import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logout } from "../actions/auth";
import { CreateIssueDialog } from "@/components/CreateIssueDialog";
import { CommandPalette } from "@/components/CommandPalette";
import { Sidebar } from "@/components/Sidebar";
import { UserMenu } from "@/components/UserMenu";
import { Shortcuts } from "@/components/Shortcuts";
import { IssuePeek } from "@/components/IssuePeek";
import { SplashScreen } from "@/components/SplashScreen";
import { TourHost } from "@/components/Tour";
import { LabelColorsProvider } from "@/components/LabelColors";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [projects, users, filters, labelColors] = await Promise.all([
    db.project.findMany({ select: { id: true, key: true, name: true, color: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.savedFilter.findMany({
      where: { OR: [{ ownerId: user.id }, { shared: true }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true, query: true, projectId: true },
    }),
    db.labelColor.findMany({ select: { name: true, color: true } }),
  ]);
  const keyById = Object.fromEntries(projects.map((p) => [p.id, p.key]));
  const filterLinks = filters.map((f) => ({
    id: f.id,
    name: f.name,
    href: f.projectId && keyById[f.projectId] ? `/projects/${keyById[f.projectId]}/issues?${f.query}` : `/filters?${f.query}`,
  }));
  return (
    <LabelColorsProvider initial={Object.fromEntries(labelColors.map((l) => [l.name, l.color]))}>
    <div className="min-h-screen lg:flex">
      <SplashScreen />
      <Sidebar projects={projects} filters={filterLinks}
        user={<UserMenu name={user.name} email={user.email} role={user.role} logout={logout} />} />
      <div className="min-w-0 flex-1 bg-white dark:bg-slate-900/40">{children}</div>
      <CreateIssueDialog projects={projects} users={users} meId={user.id} />
      <CommandPalette projects={projects} />
      <Shortcuts projects={projects} />
      <IssuePeek meId={user.id} />
      <TourHost userName={user.name} />
    </div>
    </LabelColorsProvider>
  );
}
