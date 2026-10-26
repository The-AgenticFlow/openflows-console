// OrgStatusBanner: shown across the shell while Manager is still provisioning
// the organisation (or if provisioning did not finish). Polls the organisation
// until it becomes active, then refreshes server data. Manager enforces what
// may be done meanwhile; this only explains why some actions may be refused.
"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "@/lib/client/api";

import { useConsole } from "./shell/console-context";
import { Spinner } from "./ui/button";

export function OrgStatusBanner() {
  const { org, orgId } = useConsole();
  const router = useRouter();
  const pending = org.status !== "active";
  const { data } = useQuery({
    queryKey: ["org", orgId, "info"],
    queryFn: () => api.getOrganization(orgId),
    enabled: pending,
    refetchInterval: 3000,
    retry: false,
  });
  const status = data?.status ?? org.status;
  // After a few minutes of waiting, stop promising it is quick and point to the operator.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setSlow(true), 120_000);
    return () => clearTimeout(t);
  }, [pending]);
  useEffect(() => {
    if (pending && data?.status === "active") router.refresh();
  }, [pending, data?.status, router]);

  if (status === "active") return null;
  const working = status === "provisioning" || status === "pending";
  return (
    <div role="status" className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${working ? "border-info/30 bg-info-soft text-info" : "border-warning/30 bg-warning-soft text-warning"}`}>
      {working ? <Spinner className="mt-0.5 h-4 w-4" /> : null}
      <div>
        <p className="font-medium">{working ? "Setting up your organisation" : "Your organisation is not ready"}</p>
        <p className="mt-0.5 opacity-90">{working ? (slow ? "This is taking longer than usual. You can keep exploring; if it does not finish, ask your platform operator to check the OpenFlows Manager and Coder setup." : "This usually takes a minute or two. You can look around; creating tenants becomes available once setup finishes.") : "Setup did not finish. Contact your platform operator."}</p>
      </div>
    </div>
  );
}
