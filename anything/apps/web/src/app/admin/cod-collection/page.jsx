"use client";

/**
 * COD Collection Tracker
 * Lists all delivered orders where payment is still pending.
 * Allows bulk mark-as-collected.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  DollarSign,
  RefreshCw,
  Package,
} from "lucide-react";

const fmtMoney = (n) => `৳${Number(n ?? 0).toLocaleString("en-BD")}`;
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function CodCollectionPage() {
  const [selected, setSelected] = useState(new Set());
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["cod-pending"],
    queryFn: async () => {
      const res = await authFetch(
        "/api/orders?status=delivered&paymentMethod=cod&limit=200",
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      // Filter to only those with pending payment
      const all = Array.isArray(json.data)
        ? json.data
        : json.data?.orders || [];
      return all.filter(
        (o) => o.payment_status === "pending" || o.payment_status === "partial",
      );
    },
  });

  const orders = data || [];
  const allIds = orders.map((o) => o.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));
  const totalSelected = [...selected].reduce((sum, id) => {
    const o = orders.find((x) => x.id === id);
    return sum + Number(o?.grand_total || 0);
  }, 0);

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const collectMut = useMutation({
    mutationFn: async (ids) => {
      // Mark each selected order as paid
      const results = await Promise.allSettled(
        ids.map((id) =>
          authFetch(`/api/orders/${id}/payment`, {
            method: "POST",
            body: JSON.stringify({
              paymentStatus: "paid",
              paymentMeta: {
                collected_via: "cod",
                collectedAt: new Date().toISOString(),
              },
            }),
          }),
        ),
      );
      const failed = results.filter(
        (r) => r.status === "rejected" || !r.value?.ok,
      );
      if (failed.length > 0)
        throw new Error(`${failed.length} orders failed to update`);
      return ids.length;
    },
    onSuccess: (count) => {
      setSuccess(
        `✓ ${count} order${count !== 1 ? "s" : ""} marked as collected.`,
      );
      setError("");
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["cod-pending"] });
      setTimeout(() => setSuccess(""), 4000);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleCollect = () => {
    if (selected.size === 0) return;
    collectMut.mutate([...selected]);
  };

  return (
    <div
      style={{
        padding: "28px",
        fontFamily: "'Inter', system-ui, sans-serif",
        maxWidth: "1100px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "#0f172a",
              margin: 0,
            }}
          >
            COD Collection
          </h1>
          <p style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
            Delivered orders with pending cash payment. {orders.length} order
            {orders.length !== 1 ? "s" : ""} pending.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1.5px solid #e2e8f0",
              background: "#fff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <RefreshCw
              size={13}
              style={{
                animation: isRefetching ? "spin 1s linear infinite" : "none",
              }}
            />
            Refresh
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleCollect}
              disabled={collectMut.isPending}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "9px 18px",
                borderRadius: "9px",
                border: "none",
                background: "#16a34a",
                color: "#fff",
                fontSize: "13px",
                fontWeight: "700",
                cursor: collectMut.isPending ? "not-allowed" : "pointer",
                opacity: collectMut.isPending ? 0.7 : 1,
              }}
            >
              {collectMut.isPending ? (
                <Loader2
                  size={13}
                  style={{ animation: "spin 0.75s linear infinite" }}
                />
              ) : (
                <CheckCircle2 size={13} />
              )}
              Collect {selected.size} Order{selected.size !== 1 ? "s" : ""} ·{" "}
              {fmtMoney(totalSelected)}
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            color: "#dc2626",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {success && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 16px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            color: "#16a34a",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          <CheckCircle2 size={14} /> {success}
        </div>
      )}

      {/* Summary cards */}
      {orders.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          {[
            {
              label: "Pending Orders",
              value: orders.length,
              icon: Package,
              color: "#d97706",
            },
            {
              label: "Total Pending",
              value: fmtMoney(
                orders.reduce((s, o) => s + Number(o.grand_total), 0),
              ),
              icon: DollarSign,
              color: "#dc2626",
            },
            {
              label: "Selected",
              value: selected.size,
              icon: CheckCircle2,
              color: "#2563eb",
            },
            {
              label: "Selected Amount",
              value: fmtMoney(totalSelected),
              icon: DollarSign,
              color: "#16a34a",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <Icon size={14} style={{ color }} />
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {label}
                </span>
              </div>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: "800",
                  color: "#0f172a",
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "60px 0",
            color: "#64748b",
          }}
        >
          <Loader2
            size={24}
            style={{ animation: "spin 0.75s linear infinite" }}
          />
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "80px 0",
            color: "#94a3b8",
          }}
        >
          <CheckCircle2
            size={40}
            style={{ marginBottom: "16px", color: "#bbf7d0" }}
          />
          <p style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>
            All collected!
          </p>
          <p style={{ fontSize: "13px", marginTop: "4px" }}>
            No pending COD orders.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 1fr 120px 120px 100px",
              gap: "0",
              padding: "10px 16px",
              borderBottom: "2px solid #f1f5f9",
              background: "#f8fafc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                style={{ cursor: "pointer", width: "15px", height: "15px" }}
              />
            </div>
            {["Order", "Customer", "Amount", "Date", "Zone"].map((h) => (
              <span
                key={h}
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => toggleOne(order.id)}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 1fr 120px 120px 100px",
                gap: "0",
                padding: "13px 16px",
                borderBottom: "1px solid #f8fafc",
                cursor: "pointer",
                background: selected.has(order.id) ? "#f0fdf4" : "transparent",
                transition: "background 100ms",
              }}
              onMouseEnter={(e) => {
                if (!selected.has(order.id))
                  e.currentTarget.style.background = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selected.has(order.id)
                  ? "#f0fdf4"
                  : "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={selected.has(order.id)}
                  onChange={() => toggleOne(order.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ cursor: "pointer", width: "15px", height: "15px" }}
                />
              </div>
              <div>
                <a
                  href={`/admin/orders/${order.id}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#2563eb",
                    textDecoration: "none",
                    fontFamily: "monospace",
                  }}
                >
                  {order.order_number}
                </a>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#0f172a",
                  }}
                >
                  {order.customer_name}
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#64748b",
                    fontFamily: "monospace",
                  }}
                >
                  {order.customer_phone}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "#0f172a",
                  }}
                >
                  {fmtMoney(order.grand_total)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "12.5px", color: "#475569" }}>
                  {fmtDate(order.created_at)}
                </p>
              </div>
              <div>
                <p style={{ fontSize: "12px", color: "#64748b" }}>
                  {order.shipping_zone_name || "—"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
