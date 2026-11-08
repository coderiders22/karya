import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { requireUser } from "./auth";
import { visibleProjects } from "./permissions";

/** A project in the signed-in person's workspace. Keys are only unique per workspace. */
export const getProjectByKey = cache(async (key: string) => {
  const me = await requireUser();
  const project = await db.project.findFirst({
    where: { ...visibleProjects(me), key: key.toUpperCase() },
    include: { statuses: { orderBy: { position: "asc" } }, lead: { select: { id: true, name: true } } },
  });
  if (!project) notFound();
  return project;
});

export const issueListInclude = {
  status: true,
  assignee: { select: { id: true, name: true } },
  parent: { select: { key: true, title: true } },
} as const;
