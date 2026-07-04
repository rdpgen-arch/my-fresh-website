"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Package,
  CreditCard,
  MapPin,
  Clock,
  User,
  FileText,
  Zap,
  Printer,
  Truck,
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

const VALID_TRANSITIONS = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

const PAY_LABELS = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  sslcommerz: "SSLCommerz",
  stripe: "Stripe",
  manual: "Manual",
};

const PAY_STATUS_COLOR = {
  pending: "#64748b",
  partial: "#d97706",
  paid: "#16a34a",
  failed: "#dc2626",
  refunded: "#7c3aed",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMoney = (n, cur = "BDT") =>
  `${cur === "BDT" ? "৳" : "$"}${Number(n ?? 0).toLocaleString("en-BD")}`;

const fmtDT = (iso) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
        fontWeight: "700",
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

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({ icon: Icon, title, children }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 18px",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        {Icon && <Icon size={13} style={{ color: "#94a3b8", flexShrink: 0 }} />}
        <h3
          style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {title}
        </h3>
      </div>
      <div style={{ padding: "14px 18px" }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "5px 0",
        borderBottom: "1px solid #f8fafc",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          color: "#94a3b8",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          flexShrink: 0,
          marginRight: "16px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "12.5px",
          color: "#334155",
          textAlign: "right",
          fontFamily: mono ? "ui-monospace,monospace" : "inherit",
        }}
      >
        {value ?? <span style={{ color: "#cbd5e1" }}>—</span>}
      </span>
    </div>
  );
}

// ─── Status Panel ─────────────────────────────────────────────────────────────

function StatusPanel({ order }) {
  const [note, setNote] = useState("");
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);
  const qc = useQueryClient();
  const allowed = VALID_TRANSITIONS[order.status] ?? [];

  const mut = useMutation({
    mutationFn: async (toStatus) => {
      const res = await authFetch(`/api/orders/${order.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: toStatus, note: note.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.data;
    },
    onSuccess: () => {
      setOk(true);
      setNote("");
      setErr(null);
      setTimeout(() => setOk(false), 3000);
      qc.invalidateQueries({ queryKey: ["order", order.id] });
    },
    onError: (err) => setErr(err.message),
  });

  if (!allowed.length)
    return (
      <p style={{ fontSize: "12.5px", color: "#94a3b8", fontStyle: "italic" }}>
        No further transitions available.
      </p>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <label
          style={{
            display: "block",
            fontSize: "11px",
            fontWeight: "700",
            color: "#64748b",
            marginBottom: "5px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Note (optional)
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Confirmed by phone"
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "13px",
            border: "1.5px solid #e2e8f0",
            borderRadius: "8px",
            background: "#f8fafc",
            color: "#0f172a",
            outline: "none",
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
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {allowed.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => mut.mutate(s)}
              disabled={mut.isPending}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "9px",
                border: `1.5px solid ${cfg.border}`,
                background: cfg.bg,
                color: cfg.color,
                fontSize: "13px",
                fontWeight: "700",
                cursor: mut.isPending ? "not-allowed" : "pointer",
                opacity: mut.isPending ? 0.6 : 1,
                transition: "all 150ms",
              }}
            >
              {mut.isPending && mut.variables === s && (
                <Loader2
                  size={12}
                  style={{ animation: "spin 0.75s linear infinite" }}
                />
              )}
              <ChevronRight size={12} /> Mark as {cfg.label}
            </button>
          );
        })}
      </div>
      {err && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "9px 13px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#dc2626",
            fontSize: "12.5px",
          }}
        >
          <AlertCircle size={13} /> {err}
        </div>
      )}
      {ok && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "9px 13px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            color: "#16a34a",
            fontSize: "12.5px",
          }}
        >
          <CheckCircle2 size={13} /> Status updated. CAPI event queued.
        </div>
      )}
    </div>
  );
}

// ─── Courier Panel (Steadfast one-click booking) ──────────────────────────────

function CourierPanel({ order }) {
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [activeCourier, setActiveCourier] = useState("steadfast");
  const [pathaoCity, setPathaoCity] = useState("");
  const [pathaoZone, setPathaoZone] = useState("");
  const qc = useQueryClient();

  const steadfastMut = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/courier/steadfast/book", {
        method: "POST",
        body: JSON.stringify({ orderId: order.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Booking failed");
      return json.data;
    },
    onSuccess: (data) => {
      setOk(data.message || "Parcel booked!");
      setErr(null);
      qc.invalidateQueries({ queryKey: ["order", order.id] });
    },
    onError: (e) => {
      setErr(e.message);
      setOk(null);
    },
  });

  const pathaoMut = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/courier/pathao/book", {
        method: "POST",
        body: JSON.stringify({
          orderId: order.id,
          recipientCityId: pathaoCity,
          recipientZoneId: pathaoZone,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Booking failed");
      return json.data;
    },
    onSuccess: (data) => {
      setOk(data.message || "Parcel booked with Pathao!");
      setErr(null);
      qc.invalidateQueries({ queryKey: ["order", order.id] });
    },
    onError: (e) => {
      setErr(e.message);
      setOk(null);
    },
  });

  const isBooked = !!order.tracking_code;
  const isPending = steadfastMut.isPending || pathaoMut.isPending;

  const inputStyle = {
    width: "100%",
    padding: "7px 10px",
    fontSize: "12px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "7px",
    background: "#f8fafc",
    color: "#0f172a",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {isBooked ? (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            padding: "14px",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#166534",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: "6px",
            }}
          >
            Booked with {(order.courier || "Courier").toUpperCase()}
          </p>
          <p
            style={{
              fontSize: "14px",
              fontFamily: "ui-monospace,monospace",
              color: "#166534",
              fontWeight: "700",
            }}
          >
            🚚 {order.tracking_code}
          </p>
          {order.consignment_id &&
            order.consignment_id !== order.tracking_code && (
              <p
                style={{
                  fontSize: "11.5px",
                  color: "#6b7280",
                  marginTop: "4px",
                }}
              >
                Consignment: {order.consignment_id}
              </p>
            )}
        </div>
      ) : (
        <>
          {/* Courier selector */}
          <div style={{ display: "flex", gap: "6px" }}>
            {["steadfast", "pathao"].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setActiveCourier(c);
                  setErr(null);
                  setOk(null);
                }}
                style={{
                  flex: 1,
                  padding: "7px",
                  borderRadius: "8px",
                  border: "1.5px solid",
                  borderColor: activeCourier === c ? "#0f172a" : "#e2e8f0",
                  background: activeCourier === c ? "#0f172a" : "#fff",
                  color: activeCourier === c ? "#fff" : "#64748b",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <p style={{ fontSize: "12.5px", color: "#64748b" }}>
            One click — customer address is pre-filled automatically.
          </p>

          {activeCourier === "pathao" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <input
                placeholder="City ID (1=Dhaka, 2=Chittagong...)"
                value={pathaoCity}
                onChange={(e) => setPathaoCity(e.target.value)}
                style={inputStyle}
              />
              <input
                placeholder="Zone ID (from Pathao zone list)"
                value={pathaoZone}
                onChange={(e) => setPathaoZone(e.target.value)}
                style={inputStyle}
              />
              <p style={{ fontSize: "10.5px", color: "#94a3b8" }}>
                GET /api/courier/pathao/locations?type=cities to look up IDs
              </p>
            </div>
          )}

          <button
            onClick={() =>
              activeCourier === "steadfast"
                ? steadfastMut.mutate()
                : pathaoMut.mutate()
            }
            disabled={
              isPending ||
              (activeCourier === "pathao" && (!pathaoCity || !pathaoZone))
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "10px 18px",
              borderRadius: "9px",
              border: "none",
              background: "#0f172a",
              color: "#fff",
              fontSize: "13px",
              fontWeight: "700",
              cursor:
                isPending ||
                (activeCourier === "pathao" && (!pathaoCity || !pathaoZone))
                  ? "not-allowed"
                  : "pointer",
              opacity:
                isPending ||
                (activeCourier === "pathao" && (!pathaoCity || !pathaoZone))
                  ? 0.7
                  : 1,
              width: "100%",
              justifyContent: "center",
            }}
          >
            {isPending ? (
              <Loader2
                size={13}
                style={{ animation: "spin 0.75s linear infinite" }}
              />
            ) : (
              <Truck size={13} />
            )}
            Book with{" "}
            {activeCourier.charAt(0).toUpperCase() + activeCourier.slice(1)}
          </button>
        </>
      )}
      {err && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "9px 13px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#dc2626",
            fontSize: "12.5px",
          }}
        >
          <AlertCircle size={13} /> {err}
        </div>
      )}
      {ok && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "9px 13px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            color: "#16a34a",
            fontSize: "12.5px",
          }}
        >
          <CheckCircle2 size={13} /> {ok}
        </div>
      )}
    </div>
  );
}

// ─── Payment Panel ────────────────────────────────────────────────────────────

function PaymentPanel({ order }) {
  const [payStatus, setPayStatus] = useState(order.payment_status);
  const [metaKey, setMetaKey] = useState("");
  const [metaVal, setMetaVal] = useState("");
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: async () => {
      const meta = metaKey.trim() ? { [metaKey.trim()]: metaVal.trim() } : {};
      const res = await authFetch(`/api/orders/${order.id}/payment`, {
        method: "POST",
        body: JSON.stringify({ paymentStatus: payStatus, paymentMeta: meta }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.data;
    },
    onSuccess: () => {
      setOk(true);
      setMetaKey("");
      setMetaVal("");
      setErr(null);
      setTimeout(() => setOk(false), 3000);
      qc.invalidateQueries({ queryKey: ["order", order.id] });
    },
    onError: (err) => setErr(err.message),
  });

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    fontSize: "13px",
    border: "1.5px solid #e2e8f0",
    borderRadius: "8px",
    background: "#f8fafc",
    color: "#0f172a",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {Object.keys(order.payment_meta ?? {}).length > 0 && (
        <div
          style={{
            padding: "10px 12px",
            background: "#f8fafc",
            border: "1px solid #f1f5f9",
            borderRadius: "8px",
            marginBottom: "4px",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              fontWeight: "700",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: "8px",
            }}
          >
            Stored Gateway Data
          </p>
          {Object.entries(order.payment_meta).map(([k, v]) => (
            <div
              key={k}
              style={{ display: "flex", gap: "12px", fontSize: "12px" }}
            >
              <span
                style={{
                  color: "#94a3b8",
                  fontFamily: "monospace",
                  width: "110px",
                  flexShrink: 0,
                }}
              >
                {k}
              </span>
              <span
                style={{
                  color: "#334155",
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                }}
              >
                {String(v)}
              </span>
            </div>
          ))}
        </div>
      )}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: "700",
              color: "#64748b",
              marginBottom: "5px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Payment Status
          </label>
          <select
            value={payStatus}
            onChange={(e) => setPayStatus(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {["pending", "partial", "paid", "failed", "refunded"].map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: "700",
              color: "#64748b",
              marginBottom: "5px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Field Key (opt.)
          </label>
          <input
            type="text"
            value={metaKey}
            onChange={(e) => setMetaKey(e.target.value)}
            placeholder="trx_id"
            style={{ ...inputStyle, fontFamily: "monospace" }}
          />
        </div>
      </div>
      {metaKey.trim() && (
        <div>
          <label
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: "700",
              color: "#64748b",
              marginBottom: "5px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Value
          </label>
          <input
            type="text"
            value={metaVal}
            onChange={(e) => setMetaVal(e.target.value)}
            placeholder="TRX123XYZ"
            style={{ ...inputStyle, fontFamily: "monospace" }}
          />
        </div>
      )}
      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending}
        style={{
          padding: "9px 18px",
          borderRadius: "9px",
          border: "none",
          background: "#0f172a",
          color: "#fff",
          fontSize: "13px",
          fontWeight: "700",
          cursor: mut.isPending ? "not-allowed" : "pointer",
          opacity: mut.isPending ? 0.7 : 1,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          alignSelf: "flex-start",
        }}
      >
        {mut.isPending && (
          <Loader2
            size={13}
            style={{ animation: "spin 0.75s linear infinite" }}
          />
        )}
        Save Payment Update
      </button>
      {err && <p style={{ fontSize: "12.5px", color: "#dc2626" }}>{err}</p>}
      {ok && (
        <p style={{ fontSize: "12.5px", color: "#16a34a" }}>
          ✓ Payment updated.
        </p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminOrderDetailPage({ params }) {
  const { id: orderId } = params;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const res = await authFetch(`/api/orders/${orderId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load order.");
      return json.data;
    },
    enabled: !!orderId,
  });

  if (isLoading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: "8px",
          color: "#64748b",
        }}
      >
        <Loader2
          size={20}
          style={{ animation: "spin 0.75s linear infinite" }}
        />{" "}
        Loading order…
      </div>
    );

  if (isError || !data)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          justifyContent: "center",
          height: "100%",
          color: "#dc2626",
          fontSize: "13px",
        }}
      >
        <AlertCircle size={16} /> Order not found or failed to load.
      </div>
    );

  const order = data;
  const payStatusColor = PAY_STATUS_COLOR[order.payment_status] ?? "#64748b";

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 28px",
          borderBottom: "1px solid #e2e8f0",
          background: "#ffffff",
          flexShrink: 0,
        }}
      >
        <a
          href="/admin/orders"
          style={{
            padding: "7px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            border: "1.5px solid #e2e8f0",
            color: "#475569",
            textDecoration: "none",
            transition: "all 120ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f8fafc";
            e.currentTarget.style.borderColor = "#cbd5e1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <ArrowLeft size={14} />
        </a>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <h1
              style={{
                fontFamily: "ui-monospace,monospace",
                fontSize: "15px",
                fontWeight: "800",
                color: "#0f172a",
              }}
            >
              {order.order_number}
            </h1>
            <StatusPill status={order.status} />
          </div>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
            {fmtDT(order.created_at)} · via {order.source}
          </p>
        </div>

        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: "22px",
              fontWeight: "900",
              color: "#0f172a",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.025em",
            }}
          >
            {fmtMoney(order.grand_total, order.currency)}
          </p>
          <p
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: payStatusColor,
            }}
          >
            {PAY_LABELS[order.payment_method] ?? order.payment_method} ·{" "}
            {order.payment_status}
          </p>
        </div>

        <a
          href={`/admin/orders/${orderId}/cash-memo`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1.5px solid #e2e8f0",
            background: "#fff",
            color: "#475569",
            fontSize: "12.5px",
            fontWeight: "600",
            textDecoration: "none",
            flexShrink: 0,
            transition: "all 120ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f8fafc";
            e.currentTarget.style.borderColor = "#cbd5e1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fff";
            e.currentTarget.style.borderColor = "#e2e8f0";
          }}
        >
          <Printer size={13} /> Cash Memo
        </a>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)",
            gap: "20px",
            maxWidth: "1200px",
          }}
          className="order-detail-grid"
        >
          {/* ── Left ──────────────────────────────────────────────────── */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Items */}
            <Card icon={Package} title={`Items (${order.items?.length ?? 0})`}>
              <div>
                {order.items?.map((item, i) => {
                  const attrs = Object.entries(item.dynamic_attributes ?? {});
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        padding: "10px 0",
                        borderBottom:
                          i < order.items.length - 1
                            ? "1px solid #f8fafc"
                            : "none",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            fontSize: "13.5px",
                            fontWeight: "600",
                            color: "#0f172a",
                          }}
                        >
                          {item.name}
                        </p>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#94a3b8",
                            fontFamily: "monospace",
                            marginTop: "2px",
                          }}
                        >
                          {item.sku}
                        </p>
                        {attrs.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "4px",
                              marginTop: "5px",
                            }}
                          >
                            {attrs.map(([k, v]) => (
                              <span
                                key={k}
                                style={{
                                  padding: "2px 7px",
                                  borderRadius: "6px",
                                  background: "#f1f5f9",
                                  fontSize: "10.5px",
                                  color: "#475569",
                                  fontFamily: "monospace",
                                }}
                              >
                                {k}: {String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                          flexShrink: 0,
                          marginLeft: "16px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: "800",
                            color: "#0f172a",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtMoney(item.line_total, order.currency)}
                        </p>
                        <p
                          style={{
                            fontSize: "11.5px",
                            color: "#94a3b8",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtMoney(item.unit_price, order.currency)} ×{" "}
                          {item.quantity}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div
                style={{
                  marginTop: "14px",
                  paddingTop: "14px",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                }}
              >
                {[
                  [
                    "Subtotal",
                    fmtMoney(order.subtotal, order.currency),
                    "#475569",
                  ],
                  ...(Number(order.discount_amount) > 0
                    ? [
                        [
                          "Discount",
                          `− ${fmtMoney(order.discount_amount, order.currency)}`,
                          "#16a34a",
                        ],
                      ]
                    : []),
                  [
                    `Shipping (${order.shipping_zone_name ?? "—"})`,
                    fmtMoney(order.shipping_total, order.currency),
                    "#475569",
                  ],
                ].map(([label, val, color]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      color,
                    }}
                  >
                    <span>{label}</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {val}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "15px",
                    fontWeight: "900",
                    color: "#0f172a",
                    paddingTop: "8px",
                    borderTop: "2px solid #e2e8f0",
                  }}
                >
                  <span>Grand Total</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {fmtMoney(order.grand_total, order.currency)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Status transition */}
            <Card icon={ChevronRight} title="Update Status">
              <StatusPanel order={order} />
            </Card>

            {/* Payment */}
            <Card icon={CreditCard} title="Payment Update">
              <PaymentPanel order={order} />
            </Card>

            {/* History */}
            <Card icon={Clock} title="Status History">
              {!order.history?.length ? (
                <p
                  style={{
                    fontSize: "12.5px",
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  No history recorded.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {order.history.map((h, i) => (
                    <div key={h.id} style={{ display: "flex", gap: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: i === 0 ? "#0f172a" : "#e2e8f0",
                            flexShrink: 0,
                            marginTop: "3px",
                            border:
                              i === 0
                                ? "2px solid #0f172a"
                                : "2px solid #e2e8f0",
                          }}
                        />
                        {i < order.history.length - 1 && (
                          <div
                            style={{
                              width: "2px",
                              flex: 1,
                              background: "#f1f5f9",
                              minHeight: "16px",
                            }}
                          />
                        )}
                      </div>
                      <div
                        style={{
                          paddingBottom:
                            i < order.history.length - 1 ? "16px" : 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            flexWrap: "wrap",
                            marginBottom: "3px",
                          }}
                        >
                          {h.from_status && (
                            <>
                              <StatusPill status={h.from_status} />
                              <ChevronRight
                                size={10}
                                style={{ color: "#cbd5e1" }}
                              />
                            </>
                          )}
                          <StatusPill status={h.to_status} />
                        </div>
                        {h.note && (
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              fontStyle: "italic",
                              marginBottom: "2px",
                            }}
                          >
                            "{h.note}"
                          </p>
                        )}
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#94a3b8",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtDT(h.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── Right ──────────────────────────────────────────────────── */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <Card icon={User} title="Customer">
              <InfoRow label="Name" value={order.customer_name} />
              <InfoRow label="Phone" value={order.customer_phone} mono />
              <InfoRow label="Email" value={order.customer_email} mono />
              {order.customer_address &&
                Object.keys(order.customer_address).length > 0 && (
                  <div
                    style={{
                      marginTop: "10px",
                      paddingTop: "10px",
                      borderTop: "1px solid #f8fafc",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        marginBottom: "6px",
                      }}
                    >
                      Address
                    </p>
                    {[
                      "line1",
                      "line2",
                      "district",
                      "city",
                      "postal_code",
                      "country",
                    ].map((k) =>
                      order.customer_address[k] ? (
                        <p
                          key={k}
                          style={{
                            fontSize: "12.5px",
                            color: "#334155",
                            lineHeight: 1.5,
                          }}
                        >
                          {order.customer_address[k]}
                        </p>
                      ) : null,
                    )}
                  </div>
                )}
            </Card>

            <Card icon={MapPin} title="Shipping">
              <InfoRow label="Zone" value={order.shipping_zone_name} />
              <InfoRow label="Code" value={order.shipping_zone_code} mono />
              <InfoRow
                label="Charge"
                value={fmtMoney(order.shipping_charge, order.currency)}
              />
              <InfoRow label="ETA" value={order.estimated_delivery} />
            </Card>

            {/* ── Courier Booking ──────────────────────────────────────── */}
            <Card icon={Truck} title="Courier Booking">
              <CourierPanel order={order} />
            </Card>

            <Card icon={CreditCard} title="Payment">
              <InfoRow
                label="Method"
                value={PAY_LABELS[order.payment_method] ?? order.payment_method}
              />
              <InfoRow
                label="Status"
                value={
                  <span style={{ color: payStatusColor, fontWeight: "700" }}>
                    {order.payment_status}
                  </span>
                }
              />
            </Card>

            {order.notes && (
              <Card icon={FileText} title="Staff Notes">
                <p
                  style={{
                    fontSize: "13px",
                    color: "#475569",
                    lineHeight: "1.65",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {order.notes}
                </p>
              </Card>
            )}

            <Card icon={Zap} title="CAPI Events">
              {!Object.keys(order.capi_events_fired ?? {}).length ? (
                <p
                  style={{
                    fontSize: "12.5px",
                    color: "#94a3b8",
                    fontStyle: "italic",
                  }}
                >
                  No CAPI events fired yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {Object.entries(order.capi_events_fired).map(
                    ([event, firedAt]) => (
                      <div
                        key={event}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <CheckCircle2
                            size={12}
                            style={{ color: "#16a34a" }}
                          />
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "12px",
                              color: "#334155",
                            }}
                          >
                            {event}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: "10.5px",
                            color: "#94a3b8",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtDT(firedAt)}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media (max-width: 900px) { .order-detail-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
