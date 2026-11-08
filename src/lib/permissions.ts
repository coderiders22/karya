import type { Role } from "@prisma/client";

/**
 * Who may do what. Pure, so the same rules drive the server checks and the buttons people see.
 *
 *   Viewer   sees everything in the workspace, changes nothing
 *   Member   creates and edits issues, comments, starts their own projects
 *   Manager  also runs any project: sprints, columns, project settings, deleting issues
 *   Admin    also runs the workspace: people, roles, invites, import, backup, deleting projects
 *
 * Whoever leads a project can manage that project even as a Member.
 *
 * Students each have a workspace of their own, and teams are per project (see ProjectMember). Being
 * admin of your own workspace gives you nothing on a project you joined: there you're a teammate.
 */
const RANK: Record<Role, number> = { VIEWER: 0, MEMBER: 1, MANAGER: 2, ADMIN: 3 };

export const canEdit = (role: Role) => RANK[role] >= RANK.MEMBER;
export const canManageAll = (role: Role) => RANK[role] >= RANK.MANAGER;
export const isAdmin = (role: Role) => role === "ADMIN";
export const canManageProject = (user: { id: string; role: Role; workspaceId: string }, project: { leadId: string | null; workspaceId: string }) =>
  project.leadId === user.id || (project.workspaceId === user.workspaceId && canManageAll(user.role));

type Person = { id: string; workspaceId: string };

/** Every project this person can open: their workspace's, plus student teams they've joined. */
export const visibleProjects = (user: Person) => ({
  OR: [{ workspaceId: user.workspaceId }, { members: { some: { userId: user.id } } }],
});

/** The projects whose issues this person may delete in bulk. Being admin of your own workspace gives no rights over a team you joined. */
export const manageableProjects = (user: Person & { role: Role }) =>
  canManageAll(user.role) ? { OR: [{ workspaceId: user.workspaceId }, { leadId: user.id }] } : { leadId: user.id };

/** Who can be assigned or mentioned on a project. Pickers must use this, or students would see strangers. */
export const projectPeople = (project: { id: string; workspaceId: string }) => ({
  OR: [{ workspaceId: project.workspaceId }, { projectMemberships: { some: { projectId: project.id } } }],
});

/** Everyone this person shares a workspace or a team with. */
export const peopleIWorkWith = (user: Person) => ({
  OR: [{ workspaceId: user.workspaceId }, { projectMemberships: { some: { project: { members: { some: { userId: user.id } } } } } }],
});

export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Admin", MANAGER: "Manager", MEMBER: "Member", VIEWER: "Viewer" };

/** Shown on the Team page, so "what can a Manager do?" has an answer. */
export const ROLE_MATRIX: { label: string; viewer: boolean; member: boolean; manager: boolean; admin: boolean }[] = [
  { label: "See projects, boards and reports", viewer: true, member: true, manager: true, admin: true },
  { label: "Create and edit issues, comment", viewer: false, member: true, manager: true, admin: true },
  { label: "Start a project (and manage it as lead)", viewer: false, member: true, manager: true, admin: true },
  { label: "Manage any project: sprints, columns, GitHub", viewer: false, member: false, manager: true, admin: true },
  { label: "Delete issues", viewer: false, member: false, manager: true, admin: true },
  { label: "Invite people, change roles, reset passwords", viewer: false, member: false, manager: false, admin: true },
  { label: "Import, back up, delete projects", viewer: false, member: false, manager: false, admin: true },
];
