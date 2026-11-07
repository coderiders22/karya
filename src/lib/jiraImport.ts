import type { IssueType, Priority, StatusCategory } from "@prisma/client";
import { db } from "./db";
import { parseCsv } from "./csv";

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Parses Jira's "07/Nov/26 2:08 PM" format, then falls back to ISO / Date.parse. */
export function parseJiraDate(s: string | undefined): Date | null {
  if (!s?.trim()) return null;
  const m = s.trim().match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})\s*([AP]M))?$/i);
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    let h = Number(m[4] ?? 0);
    if (m[6]) h = (h % 12) + (m[6].toUpperCase() === "PM" ? 12 : 0);
    const d = new Date(Date.UTC(year, MONTHS[m[2].toLowerCase()] ?? 0, Number(m[1]), h, Number(m[5] ?? 0)));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Converts common Jira wiki markup to Markdown. */
export function jiraToMarkdown(s: string) {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/\{code(?::(\w+))?[^}]*\}([\s\S]*?)\{code\}/g, (_, lang, body) => "```" + (lang ?? "") + "\n" + body.trim() + "\n```")
    .replace(/\{noformat\}([\s\S]*?)\{noformat\}/g, (_, body) => "```\n" + body.trim() + "\n```")
    .split("\n")
    .map((line) => {
      const heading = line.match(/^h([1-6])\.\s+(.*)$/);
      if (heading) return "#".repeat(Number(heading[1])) + " " + heading[2];
      return line
        .replace(/^(\*+)\s+/, (_, s: string) => "  ".repeat(s.length - 1) + "- ")
        .replace(/^(#+)\s+/, (_, s: string) => "  ".repeat(s.length - 1) + "1. ")
        .replace(/^bq\.\s+/, "> ")
        .replace(/\{\{(.+?)\}\}/g, "`$1`")
        .replace(/(^|[\s(])\*(\S[^*]*?)\*(?=[\s).,!?:;]|$)/g, "$1**$2**")
        .replace(/\[([^|\]]+)\|([^\]]+)\]/g, "[$1]($2)")
        .replace(/!([^!\s|]+)(\|[^!]*)?!/g, "![]($1)")
        .replace(/\(\/\)/g, "✅").replace(/\(x\)/g, "❌");
    })
    .join("\n");
}

const TYPE: Record<string, IssueType> = { epic: "EPIC", story: "STORY", task: "TASK", bug: "BUG", "sub-task": "SUBTASK", subtask: "SUBTASK" };
const PRIO: Record<string, Priority> = { highest: "HIGHEST", blocker: "HIGHEST", critical: "HIGHEST", high: "HIGH", major: "HIGH", medium: "MEDIUM", low: "LOW", minor: "LOW", lowest: "LOWEST", trivial: "LOWEST" };

function guessCategory(status: string, category?: string): StatusCategory {
  const c = (category ?? "").toLowerCase();
  if (c === "done") return "DONE";
  if (c.includes("progress")) return "IN_PROGRESS";
  if (c.includes("to do") || c === "new") return "TODO";
  const s = status.toLowerCase();
  if (/(done|closed|resolved|complete|released|won't|cancel)/.test(s)) return "DONE";
  if (/(progress|review|test|qa|doing|develop|verify)/.test(s)) return "IN_PROGRESS";
  return "TODO";
}

export type ImportResult = { projectKey: string; created: number; statusesAdded: string[]; sprintsAdded: number; unmatchedPeople: string[]; warnings: string[] };

export async function importJiraCsv(text: string, projectId: string, importerId: string): Promise<ImportResult> {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("The file has no issues in it");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const all = (...names: string[]) => header.flatMap((h, i) => (names.includes(h) ? [i] : []));
  const col = {
    summary: idx("summary"),
    key: idx("issue key", "original key"),
    id: idx("issue id"),
    parent: idx("parent id", "parent"),
    epicLink: idx("custom field (epic link)", "epic link"),
    type: idx("issue type"),
    status: idx("status"),
    statusCat: idx("status category"),
    priority: idx("priority"),
    description: idx("description"),
    assignee: idx("assignee"),
    reporter: idx("reporter"),
    created: idx("created"),
    updated: idx("updated"),
    resolved: idx("resolved"),
    due: idx("due date", "due"),
    start: idx("start date", "custom field (start date)"),
    points: idx("story points", "custom field (story point estimate)", "custom field (story points)", "story point estimate"),
    labels: all("labels"),
    sprints: all("sprint"),
    comments: all("comment"),
  };
  if (col.summary < 0) throw new Error('Couldn\'t find a "Summary" column. Is this a Jira CSV export?');

  const project = await db.project.findUniqueOrThrow({ where: { id: projectId }, include: { statuses: true } });
  const users = await db.user.findMany({ select: { id: true, name: true, email: true } });
  const unmatched = new Set<string>();
  const findUser = (v: string) => {
    const s = v.trim().toLowerCase();
    if (!s) return null;
    const u = users.find((u) => u.email.toLowerCase() === s || u.name.toLowerCase() === s);
    if (!u) unmatched.add(v.trim());
    return u?.id ?? null;
  };

  // Statuses
  const statuses = [...project.statuses].sort((a, b) => a.position - b.position);
  const statusAdded: string[] = [];
  const statusByName = new Map(statuses.map((s) => [s.name.toLowerCase(), s.id]));
  let nextPos = statuses.length;

  // Sprints
  const sprintByName = new Map((await db.sprint.findMany({ where: { projectId } })).map((s) => [s.name.toLowerCase(), s.id]));
  let sprintsAdded = 0;

  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  const warnings: string[] = [];
  const keyToNew = new Map<string, string>(), idToNew = new Map<string, string>();
  const pendingParents: { issueId: string; ref: string }[] = [];
  let counter = project.issueCounter, created = 0;

  for (const r of rows.slice(1)) {
    const title = cell(r, col.summary);
    if (!title) continue;
    const statusName = cell(r, col.status) || statuses[0]?.name || "To Do";
    let statusId = statusByName.get(statusName.toLowerCase());
    if (!statusId) {
      const s = await db.status.create({ data: { projectId, name: statusName, category: guessCategory(statusName, cell(r, col.statusCat)), position: nextPos++ } });
      statusByName.set(statusName.toLowerCase(), s.id);
      statusAdded.push(statusName);
      statusId = s.id;
    }
    const sprintName = col.sprints.map((i) => cell(r, i)).filter(Boolean).pop();
    let sprintId: string | null = null;
    if (sprintName) {
      sprintId = sprintByName.get(sprintName.toLowerCase()) ?? null;
      if (!sprintId) {
        const s = await db.sprint.create({ data: { projectId, name: sprintName } });
        sprintByName.set(sprintName.toLowerCase(), s.id);
        sprintId = s.id;
        sprintsAdded++;
      }
    }
    counter++;
    const typeName = cell(r, col.type).toLowerCase();
    const createdAt = parseJiraDate(cell(r, col.created)) ?? new Date();
    const resolvedAt = parseJiraDate(cell(r, col.resolved));
    const isDone = (await db.status.findUniqueOrThrow({ where: { id: statusId } })).category === "DONE";
    const pts = Number(cell(r, col.points));
    const issue = await db.issue.create({
      data: {
        projectId, number: counter, key: `${project.key}-${counter}`, title: title.slice(0, 255),
        type: TYPE[typeName] ?? "TASK",
        priority: PRIO[cell(r, col.priority).toLowerCase()] ?? "MEDIUM",
        description: jiraToMarkdown(cell(r, col.description)),
        statusId, sprintId,
        assigneeId: findUser(cell(r, col.assignee)),
        reporterId: findUser(cell(r, col.reporter)) ?? importerId,
        labels: [...new Set(col.labels.map((i) => cell(r, i)).filter(Boolean))],
        storyPoints: Number.isFinite(pts) && cell(r, col.points) ? Math.round(pts) : null,
        dueDate: parseJiraDate(cell(r, col.due)),
        startDate: parseJiraDate(cell(r, col.start)),
        createdAt,
        resolvedAt: isDone ? resolvedAt ?? parseJiraDate(cell(r, col.updated)) ?? new Date() : null,
        rank: counter * 1000,
        watchers: { connect: { id: importerId } },
        activities: { create: { actorId: importerId, field: "created", to: cell(r, col.key) ? `Imported from Jira ${cell(r, col.key)}` : "Imported from Jira" } },
      },
    });
    created++;
    if (cell(r, col.key)) keyToNew.set(cell(r, col.key).toUpperCase(), issue.id);
    if (cell(r, col.id)) idToNew.set(cell(r, col.id), issue.id);
    const parentRef = cell(r, col.parent) || cell(r, col.epicLink);
    if (parentRef) pendingParents.push({ issueId: issue.id, ref: parentRef });

    for (const ci of col.comments) {
      const raw = cell(r, ci);
      if (!raw) continue;
      const parts = raw.split(";");
      const when = parts.length >= 3 ? parseJiraDate(parts[0]) : null;
      const author = parts.length >= 3 ? users.find((u) => [u.email.toLowerCase(), u.name.toLowerCase()].includes(parts[1].trim().toLowerCase())) : undefined;
      const body = parts.length >= 3 && when ? parts.slice(2).join(";") : raw;
      await db.comment.create({ data: { issueId: issue.id, authorId: author?.id ?? importerId, body: jiraToMarkdown(body), createdAt: when ?? new Date() } });
    }
  }

  for (const p of pendingParents) {
    const parentId = idToNew.get(p.ref) ?? keyToNew.get(p.ref.toUpperCase());
    if (parentId && parentId !== p.issueId) await db.issue.update({ where: { id: p.issueId }, data: { parentId } });
    else warnings.push(`Couldn't find parent "${p.ref}" in the file`);
  }

  // Sprints where every issue is done are treated as finished.
  for (const id of sprintByName.values()) {
    const open = await db.issue.count({ where: { sprintId: id, status: { category: { not: "DONE" } } } });
    const any = await db.issue.count({ where: { sprintId: id } });
    if (any && !open) await db.sprint.update({ where: { id }, data: { state: "CLOSED" } });
  }

  await db.project.update({ where: { id: projectId }, data: { issueCounter: counter } });
  return { projectKey: project.key, created, statusesAdded: statusAdded, sprintsAdded, unmatchedPeople: [...unmatched], warnings: warnings.slice(0, 10) };
}
