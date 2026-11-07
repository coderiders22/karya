"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createIssue } from "@/app/actions/issues";
import { smartParse } from "@/lib/smartParse";

/** One-line issue creation with inline syntax (@person !priority #label 3pts due:fri bug). */
export function QuickAdd({ projectId, users, meId, sprintId, statusId, placeholder = "Add an issue…" }: {
  projectId: string; users: { id: string; name: string }[]; meId: string; sprintId?: string; statusId?: string; placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [active, setActive] = useState(false);
  const [pending, start] = useTransition();

  const submit = () => {
    const p = smartParse(value, users, meId);
    if (!p.title) return;
    const f = new FormData();
    f.set("projectId", projectId);
    f.set("title", p.title);
    if (p.type) f.set("type", p.type);
    if (p.priority) f.set("priority", p.priority);
    if (p.assigneeId) f.set("assigneeId", p.assigneeId);
    if (p.labels.length) f.set("labels", p.labels.join(","));
    if (p.storyPoints != null) f.set("storyPoints", String(p.storyPoints));
    if (p.dueDate) f.set("dueDate", p.dueDate);
    if (p.parentKey) f.set("parentKey", p.parentKey);
    if (sprintId) f.set("sprintId", sprintId);
    else if (p.sprint) f.set("activeSprint", "1");
    if (statusId) f.set("statusId", statusId);
    start(async () => {
      const r = await createIssue(f);
      if (r.error) return void toast.error(r.error);
      setValue("");
      toast.success(`Created ${r.key}`);
      router.refresh();
    });
  };

  if (!active) {
    return (
      <button onClick={() => setActive(true)} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] text-slate-500 transition-colors hover:bg-slate-200/50 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200">
        <Plus size={14} />{placeholder}
      </button>
    );
  }
  return (
    <input
      autoFocus
      value={value}
      disabled={pending}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => !value && setActive(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") { setValue(""); setActive(false); }
      }}
      placeholder="Title  @who  !high  #label  3pts  due:fri   ↵"
      className="input"
    />
  );
}
