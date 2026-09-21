import Link from "next/link";

export default function TicketNotFound() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="rounded-lg border border-border bg-surface p-8">
        <h1 className="text-lg font-semibold text-foreground">Ticket not found</h1>
        <p className="mt-2 text-sm text-muted">
          The ticket is not present in the selected tenant fleet snapshot.
        </p>
        <Link
          href="/kanban"
          className="mt-4 inline-flex rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
        >
          Back to Kanban
        </Link>
      </div>
    </div>
  );
}
