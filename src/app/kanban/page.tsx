// Kanban route: task board tracking tickets through their workflow phases.
// Renders the ADR-0004 columns via the data-layer reconciliation (buildBoard).
import { KanbanBoard } from "@/components/kanban-board";
import { PageHeader } from "@/components/page-header";

export default function KanbanPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <PageHeader
        title="Kanban"
        description="Track tasks across implementation → progress → review → done → merge."
      />
      <KanbanBoard />
    </div>
  );
}
