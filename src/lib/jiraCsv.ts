/**
 * Builds a CSV that Jira's built-in importer understands
 * (Jira: Settings → System → External System Import → CSV, or Project → Import issues).
 *
 * - "Issue Id" / "Parent Id" link epics → stories and stories → subtasks.
 * - Multi-value fields (Labels, Comment) repeat the same column header, which is how Jira expects them.
 * - All dates use the format  dd/MMM/yy h:mm a  — enter that in the importer's date format box.
 */
import type { IssueType, Priority } from "@prisma/client";

export const JIRA_DATE_FORMAT = "dd/MMM/yy h:mm a";

const TYPE_NAME: Record<IssueType, string> = { EPIC: "Epic", STORY: "Story", TASK: "Task", BUG: "Bug", SUBTASK: "Subtask" };
const PRIORITY_NAME: Record<Priority, string> = { HIGHEST: "Highest", HIGH: "High", MEDIUM: "Medium", LOW: "Low", LOWEST: "Lowest" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type ExportIssue = {
  number: number;
  key: string;
  type: IssueType;
  title: string;
  description: string;
  priority: Priority;
  labels: string[];
  storyPoints: number | null;
  dueDate: Date | null;
  startDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  status: { name: string };
  assignee: { email: string } | null;
  reporter: { email: string };
  parent: { number: number } | null;
  sprint: { name: string } | null;
  comments: { body: string; createdAt: Date; author: { email: string } }[];
};

export function jiraDate(d: Date | null) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = d.getUTCHours();
  return `${pad(d.getUTCDate())}/${MONTHS[d.getUTCMonth()]}/${pad(d.getUTCFullYear() % 100)} ${h % 12 || 12}:${pad(d.getUTCMinutes())} ${h < 12 ? "AM" : "PM"}`;
}

/** Converts common Markdown to Jira wiki markup so formatting survives the import. */
export function markdownToJira(md: string) {
  const blocks = md.replace(/\r\n?/g, "\n").split(/(```[\s\S]*?```)/g);
  return blocks
    .map((block) => {
      if (block.startsWith("```")) {
        const m = block.match(/^```(\w*)\n?([\s\S]*?)```$/);
        return m ? `{code${m[1] ? `:${m[1]}` : ""}}\n${m[2]}{code}` : block;
      }
      return block
        .split("\n")
        .map((line) =>
          line
            .replace(/^(#{1,6})\s+(.*)$/, (_, h: string, t: string) => `h${h.length}. ${t}`)
            .replace(/^(\s*)[-*]\s+\[( |x)\]\s+/i, (_, s: string, c: string) => `${s}* ${c.trim() ? "☑" : "☐"} `)
            .replace(/^(\s*)[-*]\s+/, (_, s: string) => `${"*".repeat(Math.floor(s.length / 2) + 1)} `)
            .replace(/^(\s*)\d+\.\s+/, (_, s: string) => `${"#".repeat(Math.floor(s.length / 2) + 1)} `)
            .replace(/^>\s?/, "bq. ")
            .replace(/\*\*(.+?)\*\*/g, "*$1*")
            .replace(/~~(.+?)~~/g, "-$1-")
            .replace(/`([^`]+)`/g, "{{$1}}")
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "!$2!")
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "[$1|$2]"),
        )
        .join("\n");
    })
    .join("");
}

function cell(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildJiraCsv(issues: ExportIssue[]) {
  // Parents must come before children for Jira to link them.
  const order: Record<IssueType, number> = { EPIC: 0, STORY: 1, TASK: 1, BUG: 1, SUBTASK: 2 };
  const rows = [...issues].sort((a, b) => order[a.type] - order[b.type] || a.number - b.number);

  const maxLabels = Math.max(1, ...rows.map((r) => r.labels.length));
  const maxComments = Math.max(1, ...rows.map((r) => r.comments.length));

  const header = [
    "Issue Id", "Parent Id", "Summary", "Issue Type", "Status", "Priority", "Description",
    "Assignee", "Reporter", "Story Points", "Sprint", "Start Date", "Due Date", "Created", "Updated", "Epic Name", "Original Key",
    ...Array(maxLabels).fill("Labels"),
    ...Array(maxComments).fill("Comment"),
  ];

  const lines = rows.map((r) => [
    r.number,
    r.parent?.number ?? "",
    r.title,
    TYPE_NAME[r.type],
    r.status.name,
    PRIORITY_NAME[r.priority],
    markdownToJira(r.description),
    r.assignee?.email ?? "",
    r.reporter.email,
    r.storyPoints ?? "",
    r.sprint?.name ?? "",
    jiraDate(r.startDate),
    jiraDate(r.dueDate),
    jiraDate(r.createdAt),
    jiraDate(r.updatedAt),
    r.type === "EPIC" ? r.title : "",
    r.key,
    // Jira labels can't contain spaces.
    ...Array.from({ length: maxLabels }, (_, i) => r.labels[i]?.replace(/\s+/g, "_") ?? ""),
    ...Array.from({ length: maxComments }, (_, i) => {
      const c = r.comments[i];
      return c ? `${jiraDate(c.createdAt)};${c.author.email};${markdownToJira(c.body)}` : "";
    }),
  ]);

  // BOM so Excel opens UTF-8 correctly; Jira ignores it.
  return "﻿" + [header, ...lines].map((l) => l.map(cell).join(",")).join("\r\n") + "\r\n";
}
