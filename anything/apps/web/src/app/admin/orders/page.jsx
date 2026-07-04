"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Filter,
  X,
  Download,
} from "lucide-react";
import { authFetch } from "@/utils/authFetch";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    label: "Pending",
  },
  processing: {
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    label: "Processing",
  },
  shipped: {
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    label: "Shipped",
  },
  delivered: {
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    label: "Delivered",
  },
  returned: {
    color: "#64748b",
    bg: "#f8fafc",
    border: "#e2e8f0",
    label: "Returned",
  },
  cancelled: {
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    label: "Cancelled",
  },
};

const PAY_STATUS = {
  pending: { color: "#64748b", label: "Pending" },
  partial: { color: "#d97706", label: "Partial" },
  paid: { color: "#16a34a", label: "Paid" },
  failed: { color: "#dc2626", label: "Failed" },
  refunded: { color: "#7c3aed", label: "Refunded" },
};

const PAY_LABELS = {
  cod: "COD",
  bkash: "bKash",
  nagad: "Nagad",
  sslcommerz: "SSL",
  stripe: "Stripe",
  manual: "Manual",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMoney = (n, cur = "BDT") => {
  const sym = cur === "BDT" ? "৳" : "$";
  return `${sym}${Number(n ?? 0).toLocaleString("en-BD")}`;
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

function StatusPill({ status }) {
  const s = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "99px",
        fontSize: "11px",
        fontWeight: "600",
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: s.color,
          display: "inline-block",
        }}
      />
      {s.label}
    </span>
  );
}

function SortIcon({ state }) {
  const style = { marginLeft: "4px", flexShrink: 0 };
  if (!state)
    return <ArrowUpDown size={11} style={{ ...style, color: "#cbd5e1" }} />;
  return state === "asc" ? (
    <ArrowUp size={11} style={{ ...style, color: "#475569" }} />
  ) : (
    <ArrowDown size={11} style={{ ...style, color: "#475569" }} />
  );
}

// ─── Column Definitions ───────────────────────────────────────────────────────

function useColumns() {
  return useMemo(
    () => [
      {
        accessorKey: "order_number",
        header: "Order",
        size: 180,
        cell: ({ getValue, row }) => (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <a
              href={`/admin/orders/${row.original.id}`}
              style={{
                fontFamily: "ui-monospace,monospace",
                fontSize: "12px",
                fontWeight: "700",
                color: "#0f172a",
                textDecoration: "none",
              }}
            >
              {getValue()}
            </a>
            <span
              style={{
                fontSize: "10.5px",
                color: "#94a3b8",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmtDate(row.original.created_at)} ·{" "}
              {fmtTime(row.original.created_at)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "customer_name",
        header: "Customer",
        cell: ({ getValue, row }) => (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span
              style={{ fontSize: "13px", fontWeight: "500", color: "#0f172a" }}
            >
              {getValue()}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "#94a3b8",
                fontFamily: "ui-monospace,monospace",
              }}
            >
              {row.original.customer_phone}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
        cell: ({ getValue }) => <StatusPill status={getValue()} />,
      },
      {
        accessorKey: "payment_method",
        header: "Payment",
        size: 120,
        cell: ({ getValue, row }) => {
          const ps =
            PAY_STATUS[row.original.payment_status] ?? PAY_STATUS.pending;
          return (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "2px" }}
            >
              <span
                style={{
                  fontSize: "12.5px",
                  fontWeight: "500",
                  color: "#334155",
                }}
              >
                {PAY_LABELS[getValue()] ?? getValue()}
              </span>
              <span
                style={{ fontSize: "11px", color: ps.color, fontWeight: "600" }}
              >
                {ps.label}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "shipping_zone_name",
        header: "Zone",
        size: 130,
        enableSorting: false,
        cell: ({ getValue }) => (
          <span
            style={{
              fontSize: "12.5px",
              color: getValue() ? "#475569" : "#cbd5e1",
            }}
          >
            {getValue() ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "item_count",
        header: "Items",
        size: 60,
        cell: ({ getValue }) => (
          <span
            style={{
              fontSize: "12.5px",
              fontWeight: "600",
              color: "#334155",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {getValue()}
          </span>
        ),
      },
      {
        accessorKey: "grand_total",
        header: "Total",
        size: 110,
        cell: ({ getValue, row }) => (
          <span
            style={{
              fontSize: "14px",
              fontWeight: "800",
              color: "#0f172a",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.01em",
            }}
          >
            {fmtMoney(getValue(), row.original.currency)}
          </span>
        ),
      },
    ],
    [],
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [dSearch, setDSearch] = useState(""); // debounced
  const [status, setStatus] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState([{ id: "created_at", desc: true }]);
  const PAGE_SIZE = 50;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDSearch(search);
      setPageIndex(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Build sort params
  const sortBy = sorting[0]?.id ?? "created_at";
  const sortDir = sorting[0]?.desc ? "desc" : "asc";

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "orders",
      {
        search: dSearch,
        status,
        payMethod,
        page: pageIndex + 1,
        sortBy,
        sortDir,
      },
    ],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (dSearch) p.set("search", dSearch);
      if (status) p.set("status", status);
      if (payMethod) p.set("paymentMethod", payMethod);
      p.set("page", String(pageIndex + 1));
      p.set("limit", String(PAGE_SIZE));
      p.set("sortBy", sortBy);
      p.set("sortDir", sortDir);
      const res = await authFetch(`/api/orders?${p}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    placeholderData: (prev) => prev,
  });

  const orders = data?.data ?? [];
  const totalRows = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.pages ?? 1;

  const columns = useColumns();
  const table = useReactTable({
    data: orders,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPageIndex(0);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
  });

  const handleStatus = useCallback((val) => {
    setStatus(val);
    setPageIndex(0);
  }, []);

  // Page number buttons with sliding window
  const pageNums = useMemo(() => {
    if (totalPages <= 1) return [];
    const radius = 2;
    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      if (i === 0 || i === totalPages - 1 || Math.abs(i - pageIndex) <= radius)
        pages.push(i);
      else if (pages[pages.length - 1] !== "...") pages.push("...");
    }
    return pages;
  }, [totalPages, pageIndex]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px 16px",
          borderBottom: "1px solid #f1f5f9",
          background: "#ffffff",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "#0f172a",
              letterSpacing: "-0.025em",
            }}
          >
            Orders
          </h1>
          <p style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
            {isLoading
              ? "Loading…"
              : `${totalRows.toLocaleString()} total orders`}
          </p>
        </div>
        <a
          href="/admin/orders/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 18px",
            borderRadius: "9px",
            background: "var(--accent, #5B21B6)",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: "700",
            textDecoration: "none",
            boxShadow: "0 2px 8px rgba(91,33,182,0.3)",
          }}
        >
          <Plus size={14} /> New Order
        </a>
      </div>

      {/* ── Status filter pills ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "12px 28px",
          background: "#ffffff",
          borderBottom: "1px solid #f1f5f9",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => handleStatus("")}
          style={{
            padding: "5px 14px",
            borderRadius: "99px",
            fontSize: "12px",
            fontWeight: "600",
            border: `1.5px solid ${!status ? "var(--accent, #5B21B6)" : "#e2e8f0"}`,
            background: !status ? "var(--accent, #5B21B6)" : "transparent",
            color: !status ? "white" : "#475569",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 120ms",
          }}
        >
          All Orders
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, s]) => (
          <button
            key={key}
            onClick={() => handleStatus(status === key ? "" : key)}
            style={{
              padding: "5px 14px",
              borderRadius: "99px",
              fontSize: "12px",
              fontWeight: "600",
              border: `1.5px solid ${status === key ? s.border : "#e2e8f0"}`,
              background: status === key ? s.bg : "transparent",
              color: status === key ? s.color : "#475569",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 120ms",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 28px",
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          flexShrink: 0,
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", width: "280px" }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order #, name, or phone…"
            style={{
              width: "100%",
              paddingLeft: "32px",
              paddingRight: search ? "32px" : "10px",
              paddingTop: "8px",
              paddingBottom: "8px",
              fontSize: "13px",
              border: "1.5px solid #e2e8f0",
              borderRadius: "8px",
              background: "#f8fafc",
              color: "#0f172a",
              outline: "none",
              transition: "border-color 150ms",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#2563eb";
              e.target.style.background = "#fff";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.background = "#f8fafc";
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#94a3b8",
                padding: "2px",
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Payment method filter */}
        <select
          value={payMethod}
          onChange={(e) => {
            setPayMethod(e.target.value);
            setPageIndex(0);
          }}
          style={{
            fontSize: "13px",
            border: "1.5px solid #e2e8f0",
            borderRadius: "8px",
            background: "#f8fafc",
            color: "#334155",
            padding: "8px 12px",
            outline: "none",
          }}
        >
          <option value="">All Payment Methods</option>
          {Object.entries(PAY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>

        <div
          style={{
            marginLeft: "auto",
            fontSize: "12px",
            color: "#94a3b8",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {!isLoading &&
            !isError &&
            `${orders.length} of ${totalRows.toLocaleString()} orders`}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "auto" }}>
        {isError ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "center",
              padding: "60px 0",
              color: "#dc2626",
              fontSize: "13px",
            }}
          >
            <AlertCircle size={16} /> Failed to load orders. Please try again.
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "800px",
            }}
          >
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                {table.getHeaderGroups().map((hg) =>
                  hg.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        padding: "9px 16px",
                        fontSize: "10.5px",
                        fontWeight: "700",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                        cursor: header.column.getCanSort()
                          ? "pointer"
                          : "default",
                        textAlign: "left",
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                      onMouseEnter={(e) => {
                        if (header.column.getCanSort())
                          e.currentTarget.style.color = "#475569";
                      }}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "#94a3b8")
                      }
                    >
                      <span
                        style={{ display: "inline-flex", alignItems: "center" }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getCanSort() && (
                          <SortIcon state={header.column.getIsSorted()} />
                        )}
                      </span>
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid #f8fafc",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  >
                    {columns.map((_, j) => (
                      <td key={j} style={{ padding: "14px 16px" }}>
                        <div
                          style={{
                            height: "12px",
                            background: "#f1f5f9",
                            borderRadius: "4px",
                            width: j === 0 ? "60%" : j === 1 ? "80%" : "50%",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{ padding: "80px 0", textAlign: "center" }}
                  >
                    <ShoppingBag
                      size={32}
                      style={{
                        color: "#e2e8f0",
                        margin: "0 auto 12px",
                        display: "block",
                      }}
                    />
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#64748b",
                      }}
                    >
                      No orders found
                    </p>
                    <p
                      style={{
                        fontSize: "12.5px",
                        color: "#94a3b8",
                        marginTop: "4px",
                      }}
                    >
                      {dSearch || status || payMethod
                        ? "Try adjusting your filters."
                        : "Orders will appear here once placed."}
                    </p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid #f8fafc",
                      cursor: "pointer",
                      transition: "background 80ms",
                    }}
                    onClick={() =>
                      (window.location.href = `/admin/orders/${row.original.id}`)
                    }
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f8fafc")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "")
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{
                          padding: "12px 16px",
                          verticalAlign: "middle",
                          width: cell.column.getSize(),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {!isLoading && !isError && totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 28px",
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: "#94a3b8",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Page {pageIndex + 1} of {totalPages}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              style={{
                padding: "5px 8px",
                borderRadius: "7px",
                border: "1.5px solid #e2e8f0",
                background: "none",
                cursor: pageIndex === 0 ? "not-allowed" : "pointer",
                color: "#475569",
                opacity: pageIndex === 0 ? 0.35 : 1,
              }}
            >
              <ChevronLeft size={14} />
            </button>
            {pageNums.map((p, i) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${i}`}
                  style={{
                    padding: "0 4px",
                    color: "#94a3b8",
                    fontSize: "12px",
                  }}
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPageIndex(p)}
                  style={{
                    minWidth: "30px",
                    height: "30px",
                    borderRadius: "7px",
                    padding: "0 4px",
                    border: `1.5px solid ${pageIndex === p ? "#0f172a" : "#e2e8f0"}`,
                    background: pageIndex === p ? "#0f172a" : "none",
                    color: pageIndex === p ? "white" : "#475569",
                    fontSize: "12.5px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {p + 1}
                </button>
              ),
            )}
            <button
              onClick={() =>
                setPageIndex((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={pageIndex === totalPages - 1}
              style={{
                padding: "5px 8px",
                borderRadius: "7px",
                border: "1.5px solid #e2e8f0",
                background: "none",
                cursor:
                  pageIndex === totalPages - 1 ? "not-allowed" : "pointer",
                color: "#475569",
                opacity: pageIndex === totalPages - 1 ? 0.35 : 1,
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
      `}</style>
    </div>
  );
}
