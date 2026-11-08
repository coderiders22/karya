"use client";

import { createContext, useContext, useMemo } from "react";
import type { Role, UserMode } from "@prisma/client";
import { canEdit, isAdmin } from "@/lib/permissions";

type Access = { role: Role; mode: UserMode; canEdit: boolean; isAdmin: boolean };
const Ctx = createContext<Access>({ role: "VIEWER", mode: "PROFESSIONAL", canEdit: false, isAdmin: false });

/** What the signed-in person may do, so screens hide what the server would refuse anyway. */
export function AccessProvider({ role, mode, children }: { role: Role; mode: UserMode; children: React.ReactNode }) {
  const value = useMemo(() => ({ role, mode, canEdit: canEdit(role), isAdmin: isAdmin(role) }), [role, mode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAccess = () => useContext(Ctx);
