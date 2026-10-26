// Activity page: operations and audit history.
import type { Metadata } from "next";

import { ActivityView } from "@/components/activity-view";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <>
      <PageHeader title="Activity" description="Operations and audit history for this organisation." />
      <ActivityView />
    </>
  );
}
