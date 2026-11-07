import Link from "next/link";
import type { IssueType, Priority, StatusCategory } from "@prisma/client";
import { Inbox } from "lucide-react";
import { Avatar, EmptyState, IssueKey, PriorityIcon, StatusPill, TypeIcon } from "./IssueBits";

type Row = {
  id: string; key: string; title: string; type: IssueType; priority: Priority; storyPoints: number | null;
  dueDate: Date | null; updatedAt: Date; status: { name: string; category: StatusCategory };
  assignee: { name: string } | null; project?: { name: string };
};

export function IssueTable({ issues, showProject }: { issues: Row[]; showProject?: boolean }) {
  if (issues.length === 0) return <div className="card"><EmptyState icon={Inbox} title="Nothing here">You&apos;re clear.</EmptyState></div>;
  const now = Date.now();
  return (
    <div data-peek-scope className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left">
          <tr className="border-b border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900 [&>th]:px-3 [&>th]:py-2 [&>th]:text-xs [&>th]:font-medium [&>th]:text-slate-500">
            <th className="w-8"></th><th>Key</th><th>Title</th>{showProject && <th>Project</th>}<th>Status</th><th>Priority</th><th>Est.</th><th>Assignee</th><th>Due</th><th>Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {issues.map((i) => (
            <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 [&>td]:px-3 [&>td]:py-2">
              <td><TypeIcon type={i.type} /></td>
              <td className="whitespace-nowrap"><Link href={`/issues/${i.key}`} className="hover:underline"><IssueKey k={i.key} /></Link></td>
              <td className="max-w-md truncate"><Link href={`/issues/${i.key}`} className="hover:underline">{i.title}</Link></td>
              {showProject && <td className="whitespace-nowrap text-muted">{i.project?.name}</td>}
              <td><StatusPill name={i.status.name} category={i.status.category} /></td>
              <td><PriorityIcon priority={i.priority} /></td>
              <td className="text-muted">{i.storyPoints ?? ""}</td>
              <td className="whitespace-nowrap"><span className="flex items-center gap-2"><Avatar name={i.assignee?.name} size={5} />{i.assignee?.name ?? <span className="text-muted">Unassigned</span>}</span></td>
              <td className={`whitespace-nowrap text-xs ${i.dueDate && i.dueDate.getTime() < now && i.status.category !== "DONE" ? "font-semibold text-red-600" : "text-muted"}`}>
                {i.dueDate?.toISOString().slice(0, 10)}
              </td>
              <td className="whitespace-nowrap text-xs text-muted">{i.updatedAt.toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
