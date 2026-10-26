// OperationDetail: stable, shareable page body for one operation. Manager
// scopes the lookup to the caller's organisations, so a colleague in the same
// organisation can open the same URL while anyone else gets "not found".
"use client";

import Link from "next/link";

import type { ConsoleError } from "@/lib/client/api";
import { useOperation } from "@/lib/client/queries";
import { canOperate } from "@/lib/manager/contract";

import { OperationProgress } from "./operation-progress";
import { useConsole } from "./shell/console-context";
import { LinkButton } from "./ui/button";
import { Card, CardHeader, EmptyState } from "./ui/primitives";

export function OperationDetail({ operationId }: Readonly<{ operationId: string }>) {
  const { org, role } = useConsole();
  const { error } = useOperation(operationId);
  if ((error as ConsoleError | null)?.status === 404) {
    return <Card><EmptyState title="Operation not found" description="It may belong to another organisation." action={<LinkButton href={`/o/${org.slug}`}>Back to overview</LinkButton>} /></Card>;
  }
  return (
    <Card>
      <CardHeader title="Operation" description="Progress is refreshed automatically." />
      <div className="space-y-4 p-5">
        <OperationProgress operationId={operationId} canRetry={canOperate(role)} />
        <Link href={`/o/${org.slug}/tenants`} className="text-sm font-medium text-primary hover:underline">Back to tenants</Link>
      </div>
    </Card>
  );
}
