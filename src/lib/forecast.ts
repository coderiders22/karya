const DAY = 86400000;

export type Forecast = {
  status: "on-track" | "at-risk" | "off-track" | "not-started" | "done";
  unit: "pts" | "issues";
  total: number;
  done: number;
  timePct: number;
  workPct: number;
  projected: number;
  daysLeft: number;
  message: string;
};

/** Projects where a running sprint will land if the team keeps its current pace. */
export function forecastSprint(
  sprint: { startDate: Date | null; endDate: Date | null },
  issues: { storyPoints: number | null; resolvedAt: Date | null }[],
  now = new Date(),
): Forecast | null {
  if (!sprint.startDate || !sprint.endDate || issues.length === 0) return null;
  const usePoints = issues.some((i) => i.storyPoints);
  const w = (i: { storyPoints: number | null }) => (usePoints ? i.storyPoints ?? 0 : 1);
  const unit = usePoints ? "pts" : "issues";
  const total = issues.reduce((n, i) => n + w(i), 0);
  const done = issues.filter((i) => i.resolvedAt).reduce((n, i) => n + w(i), 0);
  const span = Math.max(DAY, sprint.endDate.getTime() - sprint.startDate.getTime());
  const elapsed = Math.min(span, Math.max(0, now.getTime() - sprint.startDate.getTime()));
  const daysLeft = Math.max(0, Math.ceil((sprint.endDate.getTime() - now.getTime()) / DAY));
  const timePct = Math.round((elapsed / span) * 100);
  const workPct = total ? Math.round((done / total) * 100) : 0;
  const base = { unit, total, done, timePct, workPct, daysLeft } as const;

  if (done >= total) return { ...base, status: "done", projected: total, message: "Everything committed is done." };
  if (elapsed < DAY) return { ...base, status: "not-started", projected: total, message: "Forecast appears after the first day." };

  const projected = Math.round(done + (done / elapsed) * (span - elapsed));
  const slip = total - projected;
  if (slip <= 0) return { ...base, status: "on-track", projected: total, message: `On pace to finish all ${total} ${unit}.` };
  const ratio = projected / total;
  return {
    ...base,
    status: ratio >= 0.75 ? "at-risk" : "off-track",
    projected,
    message: `At the current pace about ${slip} ${unit} won't make it. Consider cutting scope now.`,
  };
}

/** Compares a planned sprint against the team's recent velocity. */
export function commitmentCheck(committedPts: number, recentVelocity: number[]) {
  if (recentVelocity.length === 0 || committedPts === 0) return null;
  const avg = Math.round(recentVelocity.reduce((a, b) => a + b, 0) / recentVelocity.length);
  if (avg === 0) return null;
  const pct = Math.round((committedPts / avg) * 100);
  return { avg, pct, over: pct > 115 };
}
