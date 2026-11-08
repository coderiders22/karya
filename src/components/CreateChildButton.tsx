"use client";
import { openCreateIssue } from "./CreateIssueDialog";
import { Plus } from "lucide-react";
import { useAccess } from "./Access";

export function CreateChildButton({ projectId, parentId, isEpic, compact }: { projectId: string; parentId: string; isEpic: boolean; compact?: boolean }) {
  const { canEdit } = useAccess();
  if (!canEdit) return null;
  return (
    <button className="btn-ghost whitespace-nowrap text-sm" title={isEpic ? "Add issue to epic" : "Add sub-issue"} onClick={() => openCreateIssue({ projectId, parentId, type: isEpic ? "STORY" : "SUBTASK" })}>
      <Plus size={14} />{compact ? "" : isEpic ? "Add issue" : "Add sub-issue"}
    </button>
  );
}
