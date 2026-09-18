import { PageHeader } from "@/components/page-header";
import { FleetOverview } from "@/components/fleet-overview";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <PageHeader
        title="Dashboard"
        description="Live status of your OpenFlows fleet."
      />
      <FleetOverview />
    </div>
  );
}
