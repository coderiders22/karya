"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteFilter } from "@/app/actions/bulk";
import { X } from "lucide-react";
import { confirmDialog } from "./Dialog";

export function DeleteFilterButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button className="text-xs text-muted hover:text-red-600" disabled={pending} aria-label="Delete filter"
      onClick={async () => (await confirmDialog({ title: "Delete this saved filter?", message: "Only the saved filter goes; no issues are touched.", danger: true })) && start(async () => { await deleteFilter(id); router.refresh(); })}>
      <X size={13} />
    </button>
  );
}
