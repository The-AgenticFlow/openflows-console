// ConsoleContext: who is signed in, which organisations they belong to, which
// one is active and their role there. Populated once by the server layout from
// Manager (`/me` + `/organizations`); client components read it to render
// role-aware controls. Role-awareness is UX only: Manager still rejects
// forbidden calls.
"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { Me, OrgSummary } from "@/lib/manager/contract";

interface ConsoleState {
  user: Me;
  orgs: OrgSummary[];
  org: OrgSummary;
}

const Ctx = createContext<ConsoleState | null>(null);

export function ConsoleProvider({ value, children }: Readonly<{ value: ConsoleState; children: ReactNode }>) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConsole(): ConsoleState & { role: OrgSummary["role"]; orgId: string } {
  const v = useContext(Ctx);
  if (!v) throw new Error("useConsole must be used inside ConsoleProvider");
  return { ...v, role: v.org.role, orgId: v.org.organization_id };
}
