// Organisation settings page.
import type { Metadata } from "next";

import { SettingsPanel } from "@/components/settings-panel";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Organisation details, your Coder identity and danger zone." />
      <SettingsPanel />
    </>
  );
}
