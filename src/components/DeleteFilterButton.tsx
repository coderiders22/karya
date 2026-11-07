"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteFilter } from "@/app/actions/bulk";
import { X } from "lucide-react";

export function DeleteFilterButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button className="text-xs text-muted hover:text-red-600" disabled={pending} aria-label="Delete filter"
      onClick={() => confirm("Delete this saved filter?") && start(async () => { await deleteFilter(id); router.refresh(); })}>
      <X size={13} />
    </button>
  );
}
