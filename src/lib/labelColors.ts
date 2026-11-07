/**
 * The label palette. Each label either has a color someone picked (LabelColor table) or a
 * stable default worked out from its name. Violet is left out on purpose: it marks epics.
 * Class strings are written out in full so Tailwind keeps them.
 */
export const LABEL_PALETTE = {
  grey: { name: "Grey", dot: "bg-slate-400", chip: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300" },
  red: { name: "Red", dot: "bg-red-500", chip: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300" },
  orange: { name: "Orange", dot: "bg-orange-500", chip: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300" },
  amber: { name: "Amber", dot: "bg-amber-500", chip: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300" },
  lime: { name: "Lime", dot: "bg-lime-500", chip: "border-lime-200 bg-lime-50 text-lime-800 dark:border-lime-900 dark:bg-lime-950/50 dark:text-lime-300" },
  green: { name: "Green", dot: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300" },
  teal: { name: "Teal", dot: "bg-teal-500", chip: "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-300" },
  cyan: { name: "Cyan", dot: "bg-cyan-500", chip: "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-300" },
  blue: { name: "Blue", dot: "bg-sky-500", chip: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300" },
  indigo: { name: "Indigo", dot: "bg-indigo-500", chip: "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300" },
  pink: { name: "Pink", dot: "bg-pink-500", chip: "border-pink-200 bg-pink-50 text-pink-800 dark:border-pink-900 dark:bg-pink-950/50 dark:text-pink-300" },
  fuchsia: { name: "Fuchsia", dot: "bg-fuchsia-500", chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 dark:border-fuchsia-900 dark:bg-fuchsia-950/50 dark:text-fuchsia-300" },
} as const;

export type LabelColorKey = keyof typeof LABEL_PALETTE;
export const LABEL_COLOR_KEYS = Object.keys(LABEL_PALETTE) as LabelColorKey[];
export const isLabelColor = (k: string): k is LabelColorKey => k in LABEL_PALETTE;

// Defaults rotate through the colorful ones; grey is only ever chosen on purpose.
const DEFAULTS: LabelColorKey[] = ["blue", "green", "amber", "red", "indigo", "teal", "orange", "fuchsia", "lime", "cyan", "pink"];

export function defaultLabelColor(name: string): LabelColorKey {
  let h = 0;
  for (const c of name.toLowerCase()) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return DEFAULTS[h % DEFAULTS.length];
}
