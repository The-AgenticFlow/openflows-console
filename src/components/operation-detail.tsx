// OperationDetail: stable, shareable page body for one operation. Manager
// scopes the lookup to the caller's organisations, so a colleague in the same
// organisation can open the same URL while anyone else gets "not found".
"use client";

import Link from "next/link";

import type { ConsoleError } from "@/lib/client/api";
import { useOperation } from "@/lib/client/queries";
import { canOperate } from "@/lib/manager/contract";
import { useT } from "@/lib/preferences/client";

import { OperationProgress } from "./operation-progress";
import { useConsole } from "./shell/console-context";
import { LinkButton } from "./ui/button";
import { IconActivity, IconArrowRight } from "./ui/icons";
import { Card, CardHeader, EmptyState } from "./ui/primitives";

export function OperationDetail({ operationId }: Readonly<{ operationId: string }>) {
  const { org, role } = useConsole();
  const { t } = useT();
  const { error } = useOperation(operationId);
  if ((error as ConsoleError | null)?.status === 404) {
    return <Card><EmptyState title={t.operation.notFound} description={t.operation.notFoundBody} action={<LinkButton href={`/o/${org.slug}`}>{t.operation.backOverview}</LinkButton>} /></Card>;
  }
  return (
    <Card>
      <CardHeader title={t.operation.title} description={t.operation.body} icon={<IconActivity size={15} />} />
      <div className="space-y-5 p-5">
        <OperationProgress operationId={operationId} canRetry={canOperate(role)} />
        <Link href={`/o/${org.slug}/tenants`} className="group inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground">
          {t.operation.backTenants} <IconArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Card>
  );
}
