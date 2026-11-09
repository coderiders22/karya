/** Reality Check shapes and labels, safe to use in the browser. */
export type RealityKind = "quiet" | "done-pr-open" | "pr-waiting" | "untracked" | "due-not-started";

export type RealityItem = {
  kind: RealityKind;
  id: string;
  /** The card's key, or the pull request for untracked work. */
  label: string;
  title: string;
  detail: string;
  href: string;
  external?: boolean;
  assignee?: string | null;
};

export const REALITY_TITLES: Record<RealityKind, string> = {
  "done-pr-open": "Done, but the pull request isn't merged",
  quiet: "In progress, but no code activity",
  "pr-waiting": "Pull request waiting",
  untracked: "Shipped without a card",
  "due-not-started": "Due soon, not started",
};

