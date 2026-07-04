"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch, authJson } from "@/utils/authFetch";
import {
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
  Package,
  X,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  published: {
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    label: "Published",
  },
  draft: { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", label: "Draft" },
  archived: {
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    label: "Archived",
  },
};

// FIX: Use the product's own currency, NOT hardcoded USD
const fmtPrice = (price, currency = "BDT") => {
  const sym = currency === "BDT" ? "৳" : currency === "USD" ? "$" : currency;
  return `${sym}${Number(price ?? 0).toLocaleString("en-BD")}`;
};

function StatusPill({ status }) {
  const s = STATUS_CFG[status] ?? STATUS_CFG.draft;
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
      }}
    >
      <span
        style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: s.color,
        }}
      />
      {s.label}
    </span>
  );
}

function SortIcon({ state }) {
  const sty = { marginLeft: "4px", flexShrink: 0 };
  if (!state)
    return <ArrowUpDown size={11} style={{ ...sty, color: "#cbd5e1" }} />;
  return state === "asc" ? (
    <ArrowUp size={11} style={{ ...sty, color: "#475569" }} />
  ) : (
    <ArrowDown size={11} style={{ ...sty, color: "#475569" }} />
  );
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchProducts({ search, status, page, limit, sortBy, sortDir }) {
  const p = new URLSearchParams();
  if (search) p.set("search", search);
  if (status) p.set("status", status);
  p.set("page", page);
  p.set("limit", limit);
  p.set("sortBy", sortBy);
  p.set("sortDir", sortDir);
  return authJson(`/api/products?${p}`);
}

// ─── Columns ──────────────────────────────────────────────────────────────────

function useColumns(onEdit, onDelete) {
  return useMemo(
    () => [
      {
        id: "image",
        header: "",
        size: 52,
        enableSorting: false,
        cell: ({ row }) => {
          const img = row.original.image_url;
          return img ? (
            <img
              src={img}
              alt={row.original.name}
              loading="lazy"
              style={{
                width: "36px",
                height: "36px",
                objectFit: "cover",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            />
          ) : (
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Package size={15} style={{ color: "#cbd5e1" }} />
            </div>
          );
        },
      },
      {
        accessorKey: "sku",
        header: "SKU",
        size: 110,
        cell: ({ getValue }) => (
          <span
            style={{
              fontFamily: "ui-monospace,monospace",
              fontSize: "11.5px",
              color: "#64748b",
              fontWeight: "500",
            }}
          >
            {getValue()}
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ getValue, row }) => (
          <div>
            <p
              style={{
                fontSize: "13.5px",
                fontWeight: "600",
                color: "#0f172a",
                lineHeight: 1.3,
                marginBottom: "2px",
              }}
            >
              {getValue()}
            </p>
            {row.original.description && (
              <p
                style={{
                  fontSize: "11.5px",
                  color: "#94a3b8",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "240px",
                }}
              >
                {row.original.description}
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "price",
        header: "Price",
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
            {fmtPrice(getValue(), row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: "stock_quantity",
        header: "Stock",
        size: 80,
        cell: ({ getValue }) => {
          const qty = getValue();
          const color =
            qty === 0 ? "#dc2626" : qty <= 5 ? "#d97706" : "#16a34a";
          const bg = qty === 0 ? "#fef2f2" : qty <= 5 ? "#fffbeb" : "#f0fdf4";
          return (
            <span
              style={{
                fontSize: "13px",
                fontWeight: "800",
                color,
                background: bg,
                padding: "3px 8px",
                borderRadius: "6px",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {qty === 0 ? "OUT" : qty}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        cell: ({ getValue }) => <StatusPill status={getValue()} />,
      },
      {
        accessorKey: "dynamic_attributes",
        header: "Variants",
        size: 180,
        enableSorting: false,
        cell: ({ getValue }) => {
          const attrs = getValue();
          const keys = Object.keys(attrs ?? {}).filter((k) =>
            Array.isArray(attrs[k]),
          );
          if (!keys.length)
            return (
              <span style={{ color: "#cbd5e1", fontSize: "12px" }}>—</span>
            );
          return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
              {keys.slice(0, 3).map((k) => (
                <span
                  key={k}
                  style={{
                    padding: "2px 7px",
                    borderRadius: "99px",
                    background: "#f1f5f9",
                    fontSize: "10.5px",
                    color: "#475569",
                    fontWeight: "500",
                  }}
                >
                  {k}
                </span>
              ))}
              {keys.length > 3 && (
                <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                  +{keys.length - 3}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Added",
        size: 100,
        cell: ({ getValue }) => (
          <span
            style={{
              fontSize: "12px",
              color: "#94a3b8",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {new Date(getValue()).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 80,
        enableSorting: false,
        cell: ({ row }) => (
          <div
            className="row-actions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              justifyContent: "flex-end",
              opacity: 0,
              transition: "opacity 120ms",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row.original);
              }}
              title="Edit"
              style={{
                padding: "5px",
                borderRadius: "7px",
                border: "1.5px solid #e2e8f0",
                background: "#fff",
                cursor: "pointer",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original);
              }}
              title="Delete"
              style={{
                padding: "5px",
                borderRadius: "7px",
                border: "1.5px solid #fecaca",
                background: "#fef2f2",
                cursor: "pointer",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteDialog({ product, onConfirm, onCancel, isLoading }) {
  if (!product) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          width: "100%",
          maxWidth: "380px",
          margin: "0 16px",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            background: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "14px",
          }}
        >
          <Trash2 size={18} style={{ color: "#dc2626" }} />
        </div>
        <h3
          style={{
            fontSize: "15px",
            fontWeight: "700",
            color: "#0f172a",
            marginBottom: "6px",
          }}
        >
          Delete Product
        </h3>
        <p style={{ fontSize: "13.5px", color: "#64748b", lineHeight: 1.5 }}>
          Are you sure you want to delete{" "}
          <strong style={{ color: "#0f172a" }}>"{product.name}"</strong>? This
          action cannot be undone.
        </p>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "20px",
          }}
        >
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "1.5px solid #e2e8f0",
              background: "#fff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "none",
              background: "#dc2626",
              color: "#fff",
              fontSize: "13px",
              fontWeight: "700",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {isLoading && (
              <Loader2
                size={13}
                style={{ animation: "spin 0.75s linear infinite" }}
              />
            )}
            Delete Product
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [dSearch, setDSearch] = useState("");
  const [status, setStatus] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [sorting, setSorting] = useState([{ id: "created_at", desc: true }]);
  const [toDelete, setToDelete] = useState(null);
  const PAGE_SIZE = 50;

  useEffect(() => {
    const t = setTimeout(() => {
      setDSearch(search);
      setPageIndex(0);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const sortBy = sorting[0]?.id ?? "created_at";
  const sortDir = sorting[0]?.desc ? "desc" : "asc";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "products",
      { search: dSearch, status, page: pageIndex + 1, sortBy, sortDir },
    ],
    queryFn: () =>
      fetchProducts({
        search: dSearch,
        status,
        page: pageIndex + 1,
        limit: PAGE_SIZE,
        sortBy,
        sortDir,
      }),
    placeholderData: (prev) => prev,
  });

  const products = data?.data ?? [];
  const totalRows = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.pages ?? 1;

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await authFetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204)
        throw new Error(`Delete failed [${res.status}]`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setToDelete(null);
    },
    onError: (err) => console.error("Delete failed:", err),
  });

  const handleEdit = useCallback((p) => {
    window.location.href = `/admin/products/${p.id}`;
  }, []);
  const handleDelete = useCallback((p) => setToDelete(p), []);
  const columns = useColumns(handleEdit, handleDelete);

  const table = useReactTable({
    data: products,
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

  // Sliding window page numbers
  const pageNums = useMemo(() => {
    if (totalPages <= 1) return [];
    const pages = [];
    for (let i = 0; i < totalPages; i++) {
      if (i === 0 || i === totalPages - 1 || Math.abs(i - pageIndex) <= 2)
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
      {/* Header */}
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
            Products
          </h1>
          <p style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
            {isLoading
              ? "Loading…"
              : `${totalRows.toLocaleString()} total products`}
          </p>
        </div>
        <a
          href="/admin/products/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 18px",
            borderRadius: "9px",
            background: "linear-gradient(135deg, #0f172a, #1e293b)",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: "700",
            textDecoration: "none",
            boxShadow: "0 2px 4px rgba(15,23,42,0.2)",
          }}
        >
          <Plus size={14} /> Add Product
        </a>
      </div>

      {/* Toolbar */}
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
            placeholder="Search by name or SKU…"
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

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
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
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
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
            `${products.length} of ${totalRows.toLocaleString()}`}
        </div>
      </div>

      {/* Table */}
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
            <AlertCircle size={16} />{" "}
            {error?.message ?? "Failed to load products."}
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "900px",
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
                        padding: "9px 14px",
                        fontSize: "10.5px",
                        fontWeight: "700",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                        textAlign: "left",
                        cursor: header.column.getCanSort()
                          ? "pointer"
                          : "default",
                      }}
                      onClick={header.column.getToggleSortingHandler()}
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
                Array.from({ length: 10 }).map((_, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid #f8fafc",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  >
                    {columns.map((_, j) => (
                      <td key={j} style={{ padding: "14px" }}>
                        <div
                          style={{
                            height: "12px",
                            background: "#f1f5f9",
                            borderRadius: "4px",
                            width: j === 0 ? "36px" : j === 2 ? "75%" : "55%",
                            height: j === 0 ? "36px" : "12px",
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{ padding: "80px 0", textAlign: "center" }}
                  >
                    <Package
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
                      No products found
                    </p>
                    <p
                      style={{
                        fontSize: "12.5px",
                        color: "#94a3b8",
                        marginTop: "4px",
                      }}
                    >
                      {dSearch || status
                        ? "Try adjusting your filters."
                        : "Add your first product to get started."}
                    </p>
                    {!dSearch && !status && (
                      <a
                        href="/admin/products/new"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "16px",
                          padding: "9px 20px",
                          borderRadius: "9px",
                          background: "#0f172a",
                          color: "#fff",
                          fontSize: "13px",
                          fontWeight: "700",
                          textDecoration: "none",
                        }}
                      >
                        <Plus size={14} /> Add First Product
                      </a>
                    )}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid #f8fafc",
                      transition: "background 80ms",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f8fafc";
                      e.currentTarget.querySelector(
                        ".row-actions",
                      ).style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "";
                      e.currentTarget.querySelector(
                        ".row-actions",
                      ).style.opacity = "0";
                    }}
                    onClick={() =>
                      (window.location.href = `/admin/products/${row.original.id}`)
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        style={{
                          padding: "11px 14px",
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

      {/* Pagination */}
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
          <p style={{ fontSize: "12px", color: "#94a3b8" }}>
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
                  key={`e-${i}`}
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

      <DeleteDialog
        product={toDelete}
        onConfirm={() => deleteMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
        isLoading={deleteMutation.isPending}
      />

      <style jsx global>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.45} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
