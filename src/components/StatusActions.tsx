"use client";

import { Search } from "lucide-react";

export function OpenSearchButton() {
  return (
    <button className="btn" onClick={() => window.dispatchEvent(new Event("trackr:palette"))}>
      <Search size={14} />Search <span className="kbd ml-1">⌘K</span>
    </button>
  );
}
