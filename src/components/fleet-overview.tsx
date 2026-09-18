"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { fetchFleet } from "@/lib/api/fleet";
import type { Ticket } from "@/lib/domain/types";

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, Ticket>();

const columns = helper.columns([
  helper.accessor("id", { header: "ID" }),
  helper.accessor("title", { header: "Title" }),
  helper.accessor("priority", { header: "Priority" }),
  helper.display({
    id: "status",
    header: "Status",
    cell: (info) => info.row.original.status.type,
  }),
]);

const EMPTY_TICKETS: Ticket[] = [];

export function FleetOverview() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["fleet"],
    queryFn: fetchFleet,
    refetchInterval: 15_000,
  });

  const fleet = data?.[0];

  const table = useTable({
    features,
    columns,
    data: fleet?.tickets ?? EMPTY_TICKETS,
  });

  if (isLoading)
    return <p className="p-6 text-sm text-zinc-500">Loading fleet…</p>;

  if (isError)
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Failed to load fleet.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-blue-600 underline"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          Fleet · {fleet?.tenant}
        </h2>
        <span className="text-xs text-zinc-500">
          CI: {fleet?.ciReadiness ?? "unknown"} · workers:{" "}
          {Object.keys(fleet?.workerSlots ?? {}).length}
        </span>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b text-left text-zinc-500">
              {group.headers.map((header) => (
                <th key={header.id} className="px-3 py-2 font-medium">
                  {header.isPlaceholder ? null : (
                    <table.FlexRender header={header} />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b">
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2">
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
