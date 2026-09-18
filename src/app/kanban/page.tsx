// Kanban route: task board tracking tickets through their workflow phases.
// Placeholder for now — the live board is not implemented yet.
import { PageHeader } from "@/components/page-header";

export default function KanbanPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <PageHeader
        title="Kanban"
        description="Track tasks across implementation → progress → review → done → merge."
      />
      <div className="rounded-lg border border-dashed border-border bg-surface p-12 text-center text-sm text-muted">
        The task Kanban board is coming soon.
      </div>
    </div>
  );
}
