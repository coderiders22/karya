import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "./db";

export const getProjectByKey = cache(async (key: string) => {
  const project = await db.project.findUnique({
    where: { key: key.toUpperCase() },
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
