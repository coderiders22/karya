/**
 * Turns one line like
 *   "Checkout fails on Safari bug @sam !high #payments due:fri 3pts ^WR-2"
 * into a title plus structured fields. Works the same on client (live preview) and server.
 */
import type { IssueType, Priority } from "@prisma/client";

export type Parsed = {
  title: string;
  type?: IssueType;
  priority?: Priority;
  assigneeId?: string;
  assigneeName?: string;
  labels: string[];
  storyPoints?: number;
  dueDate?: string; // yyyy-mm-dd
  parentKey?: string;
  sprint?: "active";
};

const TYPES: Record<string, IssueType> = { bug: "BUG", story: "STORY", task: "TASK", epic: "EPIC", subtask: "SUBTASK" };
const PRIOS: Record<string, Priority> = {
  highest: "HIGHEST", urgent: "HIGHEST", critical: "HIGHEST", high: "HIGH", medium: "MEDIUM", normal: "MEDIUM", low: "LOW", lowest: "LOWEST",
  "1": "HIGHEST", "2": "HIGH", "3": "MEDIUM", "4": "LOW", "5": "LOWEST",
};
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function parseDue(v: string, now = new Date()): string | undefined {
  const s = v.toLowerCase();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (s === "today") return iso(base);
  if (s === "tomorrow" || s === "tmr") return iso(new Date(base.getTime() + 86400000));
  if (s === "eow") return parseDue("fri", now);
  const rel = s.match(/^\+?(\d+)([dw])$/);
  if (rel) return iso(new Date(base.getTime() + Number(rel[1]) * (rel[2] === "w" ? 7 : 1) * 86400000));
  const di = DAYS.findIndex((d) => s.startsWith(d));
  if (di >= 0) {
    const diff = (di - base.getDay() + 7) % 7 || 7;
    return iso(new Date(base.getTime() + diff * 86400000));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dm = s.match(/^(\d{1,2})[/.](\d{1,2})$/);
  if (dm) {
    const d = new Date(base.getFullYear(), Number(dm[2]) - 1, Number(dm[1]));
    if (d < base) d.setFullYear(d.getFullYear() + 1);
    return iso(d);
  }
  return undefined;
}

export function smartParse(input: string, users: { id: string; name: string }[], meId?: string): Parsed {
  const out: Parsed = { title: "", labels: [] };
  const keep: string[] = [];
  for (const tok of input.split(/\s+/).filter(Boolean)) {
    const low = tok.toLowerCase();
    let m: RegExpMatchArray | null;
    if ((m = low.match(/^@([\w.-]+)$/))) {
      const q = m[1];
      const u = q === "me" && meId ? users.find((x) => x.id === meId)
        : users.find((x) => x.name.toLowerCase().split(/\s+/).some((part) => part.startsWith(q))) ;
      if (u) { out.assigneeId = u.id; out.assigneeName = u.name; continue; }
    } else if ((m = low.match(/^#([\w-]+)$/)) && !/^\d+$/.test(m[1])) {
      out.labels.push(m[1]); continue;
    } else if ((m = low.match(/^!+([a-z0-9]*)$/))) {
      const p = m[1] ? PRIOS[m[1]] : tok.length >= 3 ? "HIGHEST" : tok.length === 2 ? "HIGH" : undefined;
      if (p) { out.priority = p; continue; }
    } else if ((m = low.match(/^p([1-5])$/))) {
      out.priority = PRIOS[m[1]]; continue;
    } else if ((m = low.match(/^(\d{1,3})(pts?|points?|sp)$/)) || (m = low.match(/^~(\d{1,3})$/))) {
      out.storyPoints = Number(m[1]); continue;
    } else if ((m = low.match(/^due:(.+)$/))) {
      const d = parseDue(m[1]);
      if (d) { out.dueDate = d; continue; }
    } else if ((m = tok.match(/^\^([A-Za-z][A-Za-z0-9]*-\d+)$/))) {
      out.parentKey = m[1].toUpperCase(); continue;
    } else if (low === "+sprint") {
      out.sprint = "active"; continue;
    } else if ((m = low.match(/^\/?(bug|story|task|epic|subtask)$/)) && (low.startsWith("/") || !out.type)) {
      // Plain words like "bug" only count when they are the last word, or prefixed with "/".
      if (low.startsWith("/")) { out.type = TYPES[m[1]]; continue; }
    }
    keep.push(tok);
  }
  // A trailing bare type word ("... bug") sets the type.
  const last = keep[keep.length - 1]?.toLowerCase();
  if (!out.type && last && TYPES[last] && keep.length > 1) { out.type = TYPES[last]; keep.pop(); }
  out.title = keep.join(" ").trim();
  return out;
}
