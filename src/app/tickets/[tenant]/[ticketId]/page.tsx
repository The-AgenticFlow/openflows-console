import Link from "next/link";
import { notFound } from "next/navigation";

import { fetchTicketDetail } from "@/lib/api/ticket-detail";
import { buildTicketDetailView } from "@/lib/domain/ticket-detail";

export default async function TicketDetailPage({
  params,
}: Readonly<{ params: Promise<{ tenant: string; ticketId: string }> }>) {
  const { tenant, ticketId } = await params;
  const detail = await fetchTicketDetail(
    decodeURIComponent(tenant),
    decodeURIComponent(ticketId),
  );

  if (!detail) notFound();

  const view = buildTicketDetailView(detail);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="font-mono">{detail.ticket.id}</span>
            <span>{detail.tenant}</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {detail.ticket.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/kanban"
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            Kanban
          </Link>
          {detail.ticket.issue_url ? (
            <a
              href={detail.ticket.issue_url}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              GitHub issue
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Fact label="Phase" value={view.workflow.phaseLabel} />
        <Fact label="Ticket status" value={view.workflow.statusLabel} />
        <Fact label="Worker" value={workerLabel(detail.ticket.status)} />
      </div>

      <section className="mt-5 rounded-lg border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-foreground">Workflow Reconciliation</h2>
        <p className="mt-2 text-sm text-muted">{view.workflow.reconciliation}</p>
        {detail.phase?.role ? (
          <p className="mt-1 text-sm text-muted">Role: {detail.phase.role}</p>
        ) : null}
      </section>

      {detail.ticket.body ? (
        <section className="mt-5 rounded-lg border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-foreground">Plan / Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
            {detail.ticket.body}
          </p>
        </section>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {view.lifecycle.map((section) => (
          <section key={section.id} className="rounded-lg border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
                <p className="mt-1 text-sm text-muted">{section.detail}</p>
              </div>
              <span
                className={
                  section.state === "available"
                    ? "rounded-full bg-success/15 px-2 py-1 text-xs font-medium text-success"
                    : "rounded-full bg-surface-muted px-2 py-1 text-xs font-medium text-muted"
                }
              >
                {section.state}
              </span>
            </div>
            {section.payload !== undefined ? <JsonBlock value={section.payload} /> : null}
          </section>
        ))}
      </div>
    </div>
  );
}

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs font-medium uppercase text-muted">{label}</div>
      <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function JsonBlock({ value }: Readonly<{ value: unknown }>) {
  return (
    <pre className="mt-4 max-h-80 overflow-auto rounded-md border border-border bg-background p-3 text-xs text-foreground">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}

function workerLabel(status: { type: string; worker_id?: string }): string {
  return status.worker_id ?? "unassigned";
}
