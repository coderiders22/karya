import { db } from "@/lib/db";
import { getProjectByKey } from "@/lib/project";
import { loadCards } from "@/lib/cards";
import { StandupView, type PersonUpdate } from "@/components/StandupView";
import { canEdit, canManageProject, projectPeople } from "@/lib/permissions";
import { requireUser } from "@/lib/auth";
import { appUrl } from "@/lib/appUrl";
import { aiAvailable } from "@/lib/ai";

/** Start of the previous working day (Friday when today is Monday). */
function lastWorkday(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const back = d.getDay() === 1 ? 3 : d.getDay() === 0 ? 2 : 1;
  return new Date(d.getTime() - back * 86400000);
}

export default async function StandupPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const me = await requireUser();
  const project = await getProjectByKey(key);
  const since = lastWorkday();
  const active = await db.sprint.findFirst({ where: { projectId: project.id, state: "ACTIVE" } });

  const day = new Date().toISOString().slice(0, 10);
  const [open, done, users, comments, notes] = await Promise.all([
    loadCards({ projectId: project.id, type: { not: "EPIC" }, status: { category: { not: "DONE" } } }),
    loadCards({ projectId: project.id, type: { not: "EPIC" }, resolvedAt: { gte: since } }),
    db.user.findMany({ where: projectPeople(project), select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.comment.groupBy({ by: ["authorId"], where: { createdAt: { gte: since }, issue: { projectId: project.id } }, _count: true }),
    db.standupNote.findMany({ where: { projectId: project.id, day }, select: { userId: true, text: true, blocker: true } }),
  ]);
  const workspace = await db.workspace.findUnique({ where: { id: project.workspaceId }, select: { aiEnabled: true } });
  const noteBy = Object.fromEntries(notes.map((n) => [n.userId, { text: n.text, blocker: n.blocker }]));
  const commentsBy = Object.fromEntries(comments.map((c) => [c.authorId, c._count]));

  const people: PersonUpdate[] = users.map((u) => {
      const mine = open.filter((i) => i.assignee?.id === u.id);
      return {
        id: u.id,
        name: u.name,
        done: done.filter((i) => i.assignee?.id === u.id),
        doing: mine.filter((i) => i.status.category === "IN_PROGRESS"),
        blocked: mine.filter((i) => i.blocked),
        next: mine.filter((i) => i.status.category === "TODO" && (!active || i.sprintId === active.id)).slice(0, 3),
        comments: commentsBy[u.id] ?? 0,
        note: noteBy[u.id] ?? { text: "", blocker: false },
      };
    });
  // Everyone on the project gets a turn, so people with nothing on the board can still add a note.

  const unassignedInSprint = open.filter((i) => !i.assignee && active && i.sprintId === active.id);

  return (
    <StandupView
      people={people}
      sinceLabel={since.toLocaleDateString(undefined, { weekday: "long" })}
      staleDays={project.staleDays}
      unassigned={unassignedInSprint}
      sprintName={active?.name}
      project={{ id: project.id, name: project.name }}
      day={day}
      canEdit={canEdit(me.role)}
      canManage={canManageProject(me, project)}
      statusLink={project.statusToken ? `${appUrl()}/status/${project.statusToken}` : null}
      ai={aiAvailable(workspace)}
    />
  );
}
