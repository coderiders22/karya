"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print or save as PDF" }: { label?: string }) {
  return <button className="btn-primary" onClick={() => window.print()}><Printer size={14} />{label}</button>;
}
