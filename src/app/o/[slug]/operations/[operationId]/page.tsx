// Operation detail page (stable, shareable URL within the organisation).
import type { Metadata } from "next";

import { OperationDetail } from "@/components/operation-detail";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Operation" };

export default async function OperationPage({ params }: Readonly<{ params: Promise<{ operationId: string }> }>) {
  const { operationId } = await params;
  return (
    <>
      <PageHeader title="Operation" />
      <OperationDetail operationId={operationId} />
    </>
  );
}
