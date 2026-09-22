// KanbanBoard: renders the task board for each tenant. Fetches the fleet from
// the /api/fleet data source and lays tickets out into ADR-0004 columns via the
// pure `buildBoard` reconciliation in the data layer — this component stays
// dumb and only groups/renders. Clicking a card opens a read-only detail panel
// for that ticket.
"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  buildBoard,
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

export function KanbanBoard() {
  const { data, isFetching, isLoading, isError, refetch } = useQuery({
    queryKey: ["kanban-fleet"],
    queryFn: fetchFleet,
    refetchInterval: 15_000,
  });

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
          />
        ))
      )}
    </div>
  );
}

function TenantBoard({
  fleet,
  board,
}: Readonly<{
  fleet: TenantFleet;
  board: ReturnType<typeof buildBoard>;
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
            tenant={fleet.tenant}
            column={column}
            cards={cardsByColumn.get(column.id) ?? []}
          />
        ))}
      </div>
    </section>
  );
}

function Column({
  tenant,
  column,
  cards,
}: Readonly<{
  tenant: string;
  column: KanbanColumn;
  cards: KanbanCard[];
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
            <Card key={card.ticket.id} tenant={tenant} card={card} tone={column.tone} />
          ))
        )}
      </div>
    </div>
  );
}

function Card({
  tenant,
  card,
  tone,
}: Readonly<{ tenant: string; card: KanbanCard; tone: KanbanColumn["tone"] }>) {
  const { ticket, worker } = card;
  return (
    <Link
      href={ticketHref(tenant, ticket.id)}
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
    </Link>
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

function ticketHref(tenant: string, ticketId: string): string {
  return `/tickets/${encodeURIComponent(tenant)}/${encodeURIComponent(ticketId)}`;
}
