// KanbanBoard: renders the task board for each tenant. Fetches the fleet from
// the /api/fleet data source and lays tickets out into ADR-0004 columns via the
// pure `buildBoard` reconciliation in the data layer — this component stays
// dumb and only groups/renders. Clicking a card opens a read-only detail panel
// for that ticket.
"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import {
  buildBoard,
  KANBAN_COLUMNS,
  type KanbanCard,
  type KanbanColumn,
  type KanbanColumnId,
} from "@/lib/domain/kanban";
import type { TenantFleet } from "@/lib/domain/types";

async function fetchFleet(): Promise<TenantFleet[]> {
  const res = await fetch("/api/fleet");
  if (!res.ok) {
    throw new Error("Failed to load fleet");
  }
  return res.json();
}

interface Selection {
  tenant: string;
  card: KanbanCard;
}

export function KanbanBoard() {
  const { data, isFetching, isLoading, isError, refetch } = useQuery({
    queryKey: ["kanban-fleet"],
    queryFn: fetchFleet,
    refetchInterval: 15_000,
  });
  const [selection, setSelection] = useState<Selection | null>(null);

  if (isLoading)
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
        Loading board…
      </div>
    );

  if (isError)
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="text-sm text-danger">Failed to load fleet.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm text-primary transition-colors hover:bg-surface-muted"
        >
          Retry
        </button>
      </div>
    );

  const fleets = data ?? [];
  const boards = fleets.map((fleet) => ({ fleet, board: buildBoard(fleet) }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3 text-xs text-muted">
        <span>
          {isFetching ? "Refreshing…" : "Live from fleet data source"}
        </span>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
        >
          Refresh
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-muted">
          No tenants found. Connect the console to an OpenFlows SharedStore or
          keep using mock data.
        </div>
      ) : (
        boards.map(({ fleet, board }) => (
          <TenantBoard
            key={fleet.tenant}
            fleet={fleet}
            board={board}
            onSelect={(card) => setSelection({ tenant: fleet.tenant, card })}
          />
        ))
      )}

      {selection ? (
        <DetailPanel selection={selection} onClose={() => setSelection(null)} />
      ) : null}
    </div>
  );
}

function TenantBoard({
  fleet,
  board,
  onSelect,
}: Readonly<{
  fleet: TenantFleet;
  board: ReturnType<typeof buildBoard>;
  onSelect: (card: KanbanCard) => void;
}>) {
  const cardsByColumn = new Map<KanbanColumnId, KanbanCard[]>();
  for (const card of board.cards) {
    const column = cardsByColumn.get(card.column) ?? [];
    column.push(card);
    cardsByColumn.set(card.column, column);
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-base font-semibold text-foreground">{fleet.tenant}</h2>
        <span className="text-xs text-muted">{fleet.tickets.length} tickets</span>
      </div>
      <div className="grid auto-cols-[minmax(14rem,18rem)] grid-flow-col gap-3 overflow-x-auto pb-2">
        {board.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            cards={cardsByColumn.get(column.id) ?? []}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function Column({
  column,
  cards,
  onSelect,
}: Readonly<{
  column: KanbanColumn;
  cards: KanbanCard[];
  onSelect: (card: KanbanCard) => void;
}>) {
  return (
    <div className="flex max-h-[70vh] flex-col rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <span className={`text-xs font-semibold uppercase tracking-wide ${columnTone(column.tone)}`}>
          {column.label}
        </span>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted">
          {cards.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {cards.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
            Empty
          </div>
        ) : (
          cards.map((card) => (
            <Card key={card.ticket.id} card={card} tone={column.tone} onClick={() => onSelect(card)} />
          ))
        )}
      </div>
    </div>
  );
}

function Card({
  card,
  tone,
  onClick,
}: Readonly<{ card: KanbanCard; tone: KanbanColumn["tone"]; onClick: () => void }>) {
  const { ticket, worker } = card;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-md border border-l-2 border-border bg-background px-3 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-surface-muted ${columnAccent(tone)}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-xs text-muted">{ticket.id}</span>
        {typeof ticket.priority === "number" ? (
          <span className="shrink-0 rounded-md bg-surface-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
            P{ticket.priority}
          </span>
        ) : null}
      </div>
      <div className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
        {ticket.title}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <span aria-hidden>◈</span>
        <span className="truncate font-mono">{worker ?? "unassigned"}</span>
      </div>
    </button>
  );
}

function DetailPanel({
  selection,
  onClose,
}: Readonly<{ selection: Selection; onClose: () => void }>) {
  const { tenant, card } = selection;
  const { ticket, phase, column, worker } = card;
  const columnDef = KANBAN_COLUMNS.find((c) => c.id === column);

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto border-l border-border bg-surface p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Ticket details"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted">{ticket.id}</span>
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted">{tenant}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${columnTone(columnDef?.tone ?? "default")}`}>
                {columnDef?.label ?? column}
              </span>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-foreground">{ticket.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="shrink-0 rounded-md border border-border px-2.5 py-1 text-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          <Row label="Priority" value={typeof ticket.priority === "number" ? `P${ticket.priority}` : "—"} />
          <Row label="Worker" value={worker ?? "unassigned"} />
          <Row label="Phase" value={phase ? phase.phase.replaceAll("_", " ") : "—"} />
          <Row label="Status" value={ticket.status.type.replaceAll("_", " ")} />
          <Row label="Branch" value={ticket.branch ?? "—"} />
          <Row label="Issue" value={ticket.issue_url ?? "—"} />
          <Row label="PR" value={ticket.status.type === "merged" ? `#${ticket.status.pr_number}` : "—"} />
          {"reason" in ticket.status && ticket.status.reason ? (
            <Row label="Reason" value={ticket.status.reason} />
          ) : null}
        </dl>

        {ticket.body ? (
          <div className="mt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Description</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{ticket.body}</p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function columnTone(tone: KanbanColumn["tone"]): string {
  switch (tone) {
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "danger":
      return "text-danger";
    default:
      return "text-foreground";
  }
}

function columnAccent(tone: KanbanColumn["tone"]): string {
  switch (tone) {
    case "success":
      return "border-l-success";
    case "warning":
      return "border-l-warning";
    case "danger":
      return "border-l-danger";
    default:
      return "border-l-primary";
  }
}
