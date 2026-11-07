import type { LinkType } from "@prisma/client";

/** relation is from the current issue's point of view, e.g. "is blocked by". */
export const LINK_RELATIONS = {
  blocks: { type: "BLOCKS", outward: true },
  "is blocked by": { type: "BLOCKS", outward: false },
  "relates to": { type: "RELATES", outward: true },
  duplicates: { type: "DUPLICATES", outward: true },
  "is duplicated by": { type: "DUPLICATES", outward: false },
} as const satisfies Record<string, { type: LinkType; outward: boolean }>;


export function describeLink(type: LinkType, outward: boolean) {
  const found = Object.entries(LINK_RELATIONS).find(([, r]) => r.type === type && r.outward === outward);
  return found?.[0] ?? (type === "RELATES" ? "relates to" : type.toLowerCase());
}
