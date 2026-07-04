"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  X,
  FileJson,
} from "lucide-react";

// ─── Status Helpers ───────────────────────────────────────────────────────────

const DELIVERY_STATUS = {
  delivered: {
    label: "Delivered",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
    iconCls: "text-emerald-600",
  },
  retrying: {
    label: "Retrying",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    Icon: RefreshCw,
    iconCls: "text-amber-500",
  },
  pending: {
    label: "Pending",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: Clock,
    iconCls: "text-slate-400",
  },
  failed: {
    label: "Failed",
    cls: "bg-red-50 text-red-700 border-red-200",
    Icon: XCircle,
    iconCls: "text-red-500",
  },
};

function DeliveryStatusBadge({ status }) {
  const cfg = DELIVERY_STATUS[status] ?? DELIVERY_STATUS.pending;
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-medium ${cfg.cls}`}
    >
      <Icon size={11} className={cfg.iconCls} />
      {cfg.label}
    </span>
  );
}

/**
 * Color-codes an HTTP status integer.
 * Green for 2xx, red for 4xx/5xx, amber for 3xx, slate for none.
 */
function HttpStatusPill({ code }) {
  if (!code)
    return <span className="text-slate-300 text-xs tabular-nums">—</span>;

  let cls;
  if (code >= 200 && code < 300)
    cls = "bg-emerald-50 text-emerald-700 border-emerald-200";
  else if (code >= 300 && code < 400)
    cls = "bg-amber-50 text-amber-700 border-amber-200";
  else cls = "bg-red-50 text-red-700 border-red-200";

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[11px] font-mono font-semibold ${cls}`}
    >
      {code}
    </span>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({ log, onClose }) {
  // All hooks must be called unconditionally — before any early return
  const payloadStr = useMemo(() => {
    if (!log) return "";
    try {
      return JSON.stringify(log.payload, null, 2);
    } catch {
      return String(log.payload ?? "");
    }
  }, [log]);

  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Drawer panel */}
      <aside className="relative z-10 flex flex-col bg-white border-l border-slate-200 w-full max-w-lg shadow-sm overflow-hidden">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileJson size={15} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-900">
              Delivery Detail
            </span>
            <DeliveryStatusBadge status={log.status} />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 border-b border-slate-100 text-xs">
          {[
            { label: "Delivery ID", value: log.id },
            { label: "Event", value: log.event_type },
            { label: "Target URL", value: log.target_url },
            {
              label: "Attempts",
              value: `${log.attempt_count} / ${log.max_attempts ?? 5}`,
            },
            {
              label: "Created",
              value: new Date(log.created_at).toLocaleString(),
            },
            {
              label: "Last Updated",
              value: new Date(log.updated_at).toLocaleString(),
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-0.5">
                {label}
              </p>
              <p className="text-slate-700 font-mono break-all leading-tight">
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Error message */}
        {log.last_error && (
          <div className="mx-5 my-3 px-3 py-2.5 rounded bg-red-50 border border-red-200">
            <p className="text-[10px] uppercase tracking-wide text-red-500 font-semibold mb-1">
              Last Error
            </p>
            <p className="text-xs text-red-700 font-mono break-all">
              {log.last_error}
            </p>
          </div>
        )}

        {/* Payload viewer */}
        <div className="flex-1 flex flex-col overflow-hidden px-5 pb-5">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mt-3 mb-1.5">
            Event Payload
          </p>
          <pre className="flex-1 overflow-auto bg-slate-950 text-slate-100 rounded p-4 text-[11px] font-mono leading-relaxed">
            {payloadStr}
          </pre>
        </div>
      </aside>
    </div>
  );
}

// ─── Column Definitions ───────────────────────────────────────────────────────

function useColumns(onExpand) {
  return useMemo(
    () => [
      {
        accessorKey: "created_at",
        header: "Timestamp",
        size: 160,
        cell: ({ getValue }) => {
          const d = new Date(getValue());
          return (
            <div>
              <p className="text-xs text-slate-800 tabular-nums">
                {d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-[11px] text-slate-400 tabular-nums">
                {d.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "event_type",
        header: "Event",
        size: 160,
        cell: ({ getValue }) => (
          <span className="text-xs font-mono text-slate-600">{getValue()}</span>
        ),
      },
      {
        accessorKey: "target_url",
        header: "Endpoint",
        cell: ({ getValue }) => (
          <span className="text-xs font-mono text-slate-500 truncate block max-w-[240px]">
            {getValue()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        cell: ({ getValue }) => <DeliveryStatusBadge status={getValue()} />,
      },
      {
        accessorKey: "attempt_count",
        header: "Attempts",
        size: 80,
        cell: ({ getValue }) => (
          <span className="text-xs text-slate-600 tabular-nums">
            {getValue()}
          </span>
        ),
      },
      {
        accessorKey: "last_error",
        header: "Last Error",
        cell: ({ getValue }) => {
          const err = getValue();
          if (!err) return <span className="text-slate-300 text-xs">—</span>;
          return (
            <span
              className="text-xs text-red-500 font-mono truncate block max-w-[200px]"
              title={err}
            >
              {err}
            </span>
          );
        },
      },
      {
        id: "inspect",
        header: "",
        size: 72,
        cell: ({ row }) => (
          <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onExpand(row.original)}
              className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Inspect
            </button>
          </div>
        ),
      },
    ],
    [onExpand],
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminWebhookLogsPage() {
  const [status, setStatus] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const PAGE_SIZE = 50;

  const handleExpand = useCallback((row) => setSelected(row), []);
  const columns = useColumns(handleExpand);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "webhook-logs",
      { status, page: pageIndex + 1, limit: PAGE_SIZE },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/webhooks/logs?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch logs.");
      return json;
    },
    refetchInterval: 15_000, // Auto-refresh every 15s
  });

  const logs = data?.data ?? [];
  const totalRows = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.pages ?? 1;

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPageIndex(0);
  };

  const statusCounts = useMemo(() => {
    const counts = { delivered: 0, retrying: 0, pending: 0, failed: 0 };
    logs.forEach((l) => {
      if (l.status in counts) counts[l.status]++;
    });
    return counts;
  }, [logs]);

  const skeletonRows = Array.from({ length: 12 }).map((_, i) => (
    <tr key={i} className="skeleton-pulse-row">
      {columns.map((col, j) => (
        <td key={j} className="px-4 py-2.5">
          <div className="skeleton-bar" />
        </td>
      ))}
    </tr>
  ));

  const emptyRow = (
    <tr>
      <td colSpan={columns.length} className="py-20 text-center">
        <Clock size={28} className="mx-auto text-slate-200 mb-3" />
        <p className="text-sm font-medium text-slate-500">
          No delivery logs yet
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Logs will appear here once events are triggered.
        </p>
      </td>
    </tr>
  );

  const dataRows = table.getRowModel().rows.map((row) => (
    <tr
      key={row.id}
      className="group hover:bg-slate-50 transition-colors cursor-default"
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="px-4 py-2.5 align-middle"
          style={{ width: cell.column.getSize() }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  ));

  const tbodyContent = isLoading
    ? skeletonRows
    : logs.length === 0
      ? emptyRow
      : dataRows;

  return (
    <div className="h-full flex flex-col">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <a
            href="/admin/webhooks"
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
            title="Back to webhooks"
          >
            <ArrowLeft size={15} />
          </a>
          <div>
            <h1 className="text-sm font-semibold text-slate-900">
              Delivery Logs
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isLoading
                ? "Loading…"
                : `${totalRows.toLocaleString()} total deliveries`}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* ── Summary Pills ─────────────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <div className="flex items-center gap-2 px-6 py-3 bg-white border-b border-slate-100">
          {Object.entries(DELIVERY_STATUS).map(([key, cfg]) => {
            const Icon = cfg.Icon;
            return (
              <button
                key={key}
                onClick={() => {
                  setStatus(status === key ? "" : key);
                  setPageIndex(0);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                  status === key
                    ? cfg.cls
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon size={11} />
                {cfg.label}
              </button>
            );
          })}
          {status && (
            <button
              onClick={() => setStatus("")}
              className="text-xs text-slate-400 hover:text-slate-700 underline transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {isError ? (
          <div className="flex items-center gap-2 justify-center py-20 text-sm text-red-500">
            <AlertCircle size={16} />
            Failed to load delivery logs.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                {table.getHeaderGroups().map((hg) =>
                  hg.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 whitespace-nowrap"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{tbodyContent}</tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {!isLoading && !isError && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-slate-200">
          <p className="text-xs text-slate-400 tabular-nums">
            Page {pageIndex + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 py-1 text-xs text-slate-600 tabular-nums">
              {pageIndex + 1} / {totalPages}
            </span>
            <button
              onClick={() =>
                setPageIndex((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={pageIndex === totalPages - 1}
              className="p-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Detail Drawer ─────────────────────────────────────────────────── */}
      <DetailDrawer log={selected} onClose={() => setSelected(null)} />

      <style jsx global>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .skeleton-pulse-row {
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }
        .skeleton-bar {
          height: 11px;
          background-color: #f1f5f9;
          border-radius: 3px;
          width: 70%;
        }
        @keyframes icon-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .icon-spin { animation: icon-spin 0.75s linear infinite; }
      `}</style>
    </div>
  );
}
