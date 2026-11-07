"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { StatusScreen } from "@/components/StatusScreen";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const ref = error.digest ?? "client";
  return (
    <StatusScreen code="ERROR" tone="error" title="Something went wrong on this page"
      actions={
        <>
          <button className="btn-primary" onClick={reset}><RotateCcw size={14} />Try again</button>
          <Link href="/your-work" className="btn">Go to Your work</Link>
        </>
      }>
      Your data is safe. This is usually a brief connection problem with the server.
      <button className="mt-3 block w-full font-mono text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        onClick={() => { navigator.clipboard.writeText(`Karya error ref: ${ref}`); toast.success("Error reference copied", { description: "Share it with whoever runs your Karya server." }); }}>
        Reference: {ref} · copy
      </button>
    </StatusScreen>
  );
}
