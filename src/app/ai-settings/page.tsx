import { AiSettings } from "@/components/ai-settings";
import { PageHeader } from "@/components/page-header";

export default function AiSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <PageHeader
        title="AI Providers & Model Policy"
        description="Manage upstream AI model providers and OpenFlows agent-to-model role assignment policies."
      />
      <div className="mt-6">
        <AiSettings />
      </div>
    </div>
  );
}
