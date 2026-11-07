import type { Prisma } from "@prisma/client";
import { db } from "./db";
import type { CardIssue } from "./types";

export const cardInclude = {
  status: true,
  assignee: { select: { id: true, name: true } },
  parent: { select: { key: true, title: true } },
  linksIn: { where: { type: "BLOCKS" as const }, select: { from: { select: { status: { select: { category: true } } } } } },
} satisfies Prisma.IssueInclude;

/** Loads issues shaped for the board (with blocked flag and serialisable dates). */
export async function loadCards(where: Prisma.IssueWhereInput): Promise<CardIssue[]> {
  const rows = await db.issue.findMany({ where, include: cardInclude, orderBy: { rank: "asc" } });
  return rows.map(({ linksIn, ...i }) => ({
    ...i,
    statusChangedAt: i.statusChangedAt.toISOString(),
    dueDate: i.dueDate?.toISOString() ?? null,
    blocked: linksIn.some((l) => l.from.status.category !== "DONE"),
  }));
}
