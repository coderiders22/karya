import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { canEdit, canManageAll, canManageProject, isAdmin, projectPeople, visibleProjects } from "./permissions";
import { SESSION_COOKIE, verifySession } from "./session";

export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const userId = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, mode: true, siteOwner: true, workspaceId: true, workspace: { select: { name: true, kind: true } } },
  });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdmin(user.role)) throw new Error("Only admins can do this.");
  return user;
}

/** Anyone who may change work (everyone except Viewers). */
export async function requireSiteOwner() {
  const user = await requireUser();
  if (!user.siteOwner) throw new Error("Not found");
  return user;
}
export async function requireEditor() {
  const user = await requireUser();
  if (!canEdit(user.role)) throw new Error("Viewers can't make changes. Ask an admin for a Member role.");
  return user;
}

/*
 * Workspace boundary. Every id that arrives from the browser goes through one of these before it
 * is used, so someone in one workspace can't reach another's data by sending its id. An id from
 * another workspace behaves exactly like an id that doesn't exist.
 */

export async function projectInWorkspace(user: CurrentUser, projectId: string) {
  return db.project.findFirstOrThrow({ where: { id: projectId, ...visibleProjects(user) } });
}

export async function issueInWorkspace(user: CurrentUser, issueId: string) {
  return db.issue.findFirstOrThrow({ where: { id: issueId, project: visibleProjects(user) } });
}

/** For admin-only actions: a project this person's workspace owns, not one they merely joined. */
export async function ownProject(user: CurrentUser, projectId: string) {
  return db.project.findFirstOrThrow({ where: { id: projectId, workspaceId: user.workspaceId } });
}
/** Someone who can be given work on this project. Anyone else behaves as if they don't exist. */
export async function personOnProject(projectId: string, userId: string) {
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId }, select: { id: true, workspaceId: true } });
  return db.user.findFirstOrThrow({ where: { id: userId, ...projectPeople(project) } });
}
export async function memberInWorkspace(user: CurrentUser, userId: string) {
  return db.user.findFirstOrThrow({ where: { id: userId, workspaceId: user.workspaceId } });
}

/** The project, if this person may run it (Manager and up, or its lead). */
export async function requireProjectManager(projectId: string) {
  const user = await requireEditor();
  const project = await projectInWorkspace(user, projectId);
  if (!canManageProject(user, project)) throw new Error("Only a manager or this project's lead can do this.");
  return { user, project };
}

export { canManageAll, canManageProject };
