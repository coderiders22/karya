"use client";
import { openCreateIssue } from "./CreateIssueDialog";
import { Plus } from "lucide-react";

export function RoadmapAddEpic({ projectId }: { projectId: string }) {
  return <button className="btn-primary" onClick={() => openCreateIssue({ projectId, type: "EPIC" })}><Plus size={14} />New epic</button>;
}
