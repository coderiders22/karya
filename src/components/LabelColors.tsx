"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { setLabelColor } from "@/app/actions/labels";
import { LABEL_COLOR_KEYS, LABEL_PALETTE, defaultLabelColor, isLabelColor, type LabelColorKey } from "@/lib/labelColors";

/**
 * Label colors for the whole app. The layout passes in the saved colors once; changing a color
 * updates every chip on screen straight away, then saves.
 */
type Ctx = { colorOf: (name: string) => LabelColorKey; setColor: (name: string, color: LabelColorKey) => void };
const LabelColorCtx = createContext<Ctx>({ colorOf: defaultLabelColor, setColor: () => {} });

export function LabelColorsProvider({ initial, children }: { initial: Record<string, string>; children: React.ReactNode }) {
  const [map, setMap] = useState(initial);
  const colorOf = useCallback((name: string) => { const c = map[name]; return c && isLabelColor(c) ? c : defaultLabelColor(name); }, [map]);
  const setColor = useCallback((name: string, color: LabelColorKey) => {
    const before = map[name];
    setMap((m) => ({ ...m, [name]: color }));
    setLabelColor(name, color).catch(() => {
      setMap((m) => { const n = { ...m }; if (before) n[name] = before; else delete n[name]; return n; });
      toast.error("Couldn't save the label color");
    });
  }, [map]);
  const value = useMemo(() => ({ colorOf, setColor }), [colorOf, setColor]);
  return <LabelColorCtx.Provider value={value}>{children}</LabelColorCtx.Provider>;
}

export const useLabelColors = () => useContext(LabelColorCtx);

export function LabelChip({ name, onRemove, className }: { name: string; onRemove?: () => void; className?: string }) {
  const { colorOf } = useLabelColors();
  return (
    <span className={clsx("inline-flex max-w-full items-center gap-1 rounded border px-1.5 text-[11.5px] font-medium leading-5", LABEL_PALETTE[colorOf(name)].chip, className)}>
      <span className="truncate">{name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} onMouseDown={(e) => e.preventDefault()} aria-label={`Remove label ${name}`} className="-mr-0.5 grid size-3.5 place-items-center rounded opacity-60 hover:opacity-100">
          <svg viewBox="0 0 12 12" width="9" height="9" aria-hidden><path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      )}
    </span>
  );
}

export function LabelDot({ name, className }: { name: string; className?: string }) {
  const { colorOf } = useLabelColors();
  return <span className={clsx("inline-block size-2.5 shrink-0 rounded-full", LABEL_PALETTE[colorOf(name)].dot, className)} />;
}

/** A row of color swatches for one label. */
export function LabelSwatches({ name, size = "md", onPicked }: { name: string; size?: "sm" | "md"; onPicked?: () => void }) {
  const { colorOf, setColor } = useLabelColors();
  const current = colorOf(name);
  return (
    <div role="radiogroup" aria-label={`Color for ${name}`} className={clsx("flex flex-wrap", size === "sm" ? "gap-1" : "gap-1.5")}>
      {LABEL_COLOR_KEYS.map((k) => (
        <button
          key={k} type="button" role="radio" aria-checked={k === current} title={LABEL_PALETTE[k].name}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { if (k !== current) setColor(name, k); onPicked?.(); }}
          className={clsx(
            "grid place-items-center rounded-full ring-offset-2 ring-offset-white transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:ring-offset-slate-900",
            LABEL_PALETTE[k].dot, size === "sm" ? "size-5" : "size-6",
            k === current && "ring-2 ring-slate-900 dark:ring-white",
          )}
        >
          {k === current && <Check size={size === "sm" ? 11 : 13} strokeWidth={3} className="text-white" />}
        </button>
      ))}
    </div>
  );
}
