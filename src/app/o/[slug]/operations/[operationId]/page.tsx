// Operation detail page (stable, shareable URL within the organisation).
import type { Metadata } from "next";

import { OperationDetail } from "@/components/operation-detail";
import { PageHeader } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getMessages();
  return { title: t.operation.metaTitle };
}

export default async function OperationPage({ params }: Readonly<{ params: Promise<{ operationId: string }> }>) {
  const [{ operationId }, { t }] = await Promise.all([params, getMessages()]);
  return (
    <>
      <PageHeader title={t.operation.title} />
      <OperationDetail operationId={operationId} />
    </>
  );
}
