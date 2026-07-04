"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  AlertCircle,
  MapPin,
  Hash,
  Phone,
} from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
    label: "Pending",
    desc: "Your order has been received and is awaiting processing.",
  },
  processing: {
    icon: Package,
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    label: "Processing",
    desc: "We're preparing your items for dispatch.",
  },
  shipped: {
    icon: Truck,
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    label: "Shipped",
    desc: "Your order is on its way! Expect delivery soon.",
  },
  delivered: {
    icon: CheckCircle2,
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    label: "Delivered",
    desc: "Your order has been delivered successfully. Enjoy!",
  },
  cancelled: {
    icon: XCircle,
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    label: "Cancelled",
    desc: "This order has been cancelled.",
  },
  returned: {
    icon: RotateCcw,
    color: "#64748b",
    bg: "#f8fafc",
    border: "#e2e8f0",
    label: "Returned",
    desc: "Your return is being processed.",
  },
};

const STEPS = ["pending", "processing", "shipped", "delivered"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMoney = (n, cur = "BDT") =>
  `${cur === "BDT" ? "৳" : "$"}${Number(n).toLocaleString("en-BD")}`;

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function useStoreSlug() {
  if (typeof window === "undefined") return "";
  return window.location.pathname.split("/").filter(Boolean)[0] ?? "";
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrderTrackingPage() {
  const storeSlug = useStoreSlug();

  const getParam = (key) => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get(key) ?? "";
  };

  const [orderNumber, setOrderNumber] = useState(() => getParam("order"));
  const [phone, setPhone] = useState(() => getParam("phone"));
  const [submitted, setSubmitted] = useState(
    () => !!(getParam("order") && getParam("phone")),
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["track", storeSlug, orderNumber, phone],
    queryFn: async () => {
      const res = await fetch(
        `/api/storefront/${storeSlug}/track?order=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Order not found.");
      return json.data;
    },
    enabled: submitted && !!orderNumber && !!phone,
    retry: false,
  });

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!orderNumber.trim() || !phone.trim()) return;
      setSubmitted(true);
    },
    [orderNumber, phone],
  );

  const order = data;
  const statusCfg = STATUS_CONFIG[order?.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const activeStep = STEPS.indexOf(order?.status ?? "pending");
  const isTerminal = ["cancelled", "returned"].includes(order?.status);

  return (
    <div
      style={{
        minHeight: "80vh",
        background: "#f8fafc",
        padding: "40px 16px 80px",
      }}
    >
      <div style={{ maxWidth: "620px", margin: "0 auto" }}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "#0f172a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <MapPin size={24} color="white" />
          </div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: "900",
              color: "#0f172a",
              letterSpacing: "-0.03em",
              marginBottom: "6px",
            }}
          >
            Track Your Order
          </h1>
          <p style={{ fontSize: "15px", color: "#64748b" }}>
            Enter your order number and phone to see the latest status.
          </p>
        </div>

        {/* ── Search form ──────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "28px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
              marginBottom: "14px",
            }}
            className="track-form-grid"
          >
            {/* Order number */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#334155",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Order Number
              </label>
              <div style={{ position: "relative" }}>
                <Hash
                  size={13}
                  style={{
                    position: "absolute",
                    left: "11px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
                <input
                  value={orderNumber}
                  onChange={(e) => {
                    setOrderNumber(e.target.value);
                    setSubmitted(false);
                  }}
                  placeholder="ORD-20260626-00001"
                  style={{
                    width: "100%",
                    paddingLeft: "32px",
                    paddingRight: "12px",
                    paddingTop: "10px",
                    paddingBottom: "10px",
                    fontSize: "13px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "9px",
                    background: "#f8fafc",
                    color: "#0f172a",
                    fontFamily: "ui-monospace,monospace",
                    outline: "none",
                    transition: "border-color 150ms",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0f172a";
                    e.target.style.background = "#fff";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.background = "#f8fafc";
                  }}
                />
              </div>
            </div>
            {/* Phone */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#334155",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Phone Number
              </label>
              <div style={{ position: "relative" }}>
                <Phone
                  size={13}
                  style={{
                    position: "absolute",
                    left: "11px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
                <input
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setSubmitted(false);
                  }}
                  placeholder="01XXXXXXXXX"
                  type="tel"
                  style={{
                    width: "100%",
                    paddingLeft: "32px",
                    paddingRight: "12px",
                    paddingTop: "10px",
                    paddingBottom: "10px",
                    fontSize: "13px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "9px",
                    background: "#f8fafc",
                    color: "#0f172a",
                    outline: "none",
                    transition: "border-color 150ms",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0f172a";
                    e.target.style.background = "#fff";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.background = "#f8fafc";
                  }}
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "13px 20px",
              borderRadius: "10px",
              border: "none",
              background: "var(--accent, #5B21B6)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "800",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 3px 8px rgba(91,33,182,0.3)",
            }}
          >
            <Search size={16} /> অর্ডার ট্র্যাক করুন
          </button>
        </form>

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {isLoading && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "3px solid #e2e8f0",
                borderTopColor: "#0f172a",
                margin: "0 auto 16px",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p
              style={{ fontSize: "14px", color: "#64748b", fontWeight: "500" }}
            >
              Looking up your order…
            </p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────── */}
        {isError && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "16px 18px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "12px",
              color: "#dc2626",
            }}
          >
            <AlertCircle
              size={18}
              style={{ flexShrink: 0, marginTop: "1px" }}
            />
            <div>
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  marginBottom: "3px",
                }}
              >
                Order not found
              </p>
              <p style={{ fontSize: "13px", color: "#b91c1c" }}>
                {error?.message ??
                  "Please check your order number and phone number."}
              </p>
            </div>
          </div>
        )}

        {/* ── Order result ─────────────────────────────────────────────── */}
        {order && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            {/* Status banner */}
            <div
              style={{
                background: statusCfg.bg,
                border: `1px solid ${statusCfg.border}`,
                borderRadius: "16px",
                padding: "28px 24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#ffffff",
                  border: `2px solid ${statusCfg.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 14px",
                  boxShadow: `0 4px 12px ${statusCfg.color}25`,
                }}
              >
                <StatusIcon size={26} style={{ color: statusCfg.color }} />
              </div>
              <p
                style={{
                  fontSize: "22px",
                  fontWeight: "900",
                  color: "#0f172a",
                  letterSpacing: "-0.025em",
                  marginBottom: "6px",
                }}
              >
                {statusCfg.label}
              </p>
              <p
                style={{
                  fontSize: "14px",
                  color: "#475569",
                  marginBottom: "12px",
                  lineHeight: "1.5",
                }}
              >
                {statusCfg.desc}
              </p>
              <p
                style={{
                  fontSize: "12px",
                  fontFamily: "ui-monospace,monospace",
                  color: "#94a3b8",
                  background: "#ffffff",
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: "99px",
                  border: `1px solid ${statusCfg.border}`,
                }}
              >
                {order.order_number}
              </p>
            </div>

            {/* Progress tracker */}
            {!isTerminal && (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "24px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "20px",
                  }}
                >
                  Order Progress
                </p>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  {STEPS.map((step, i) => {
                    const cfg = STATUS_CONFIG[step];
                    const Icon = cfg.icon;
                    const done = i <= activeStep;
                    const curr = i === activeStep;
                    return (
                      <div
                        key={step}
                        style={{
                          display: "flex",
                          flex: 1,
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                            flex: "0 0 auto",
                            zIndex: 1,
                          }}
                        >
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "50%",
                              background: done ? cfg.color : "#f1f5f9",
                              border: `2px solid ${done ? cfg.color : "#e2e8f0"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: curr
                                ? `0 0 0 4px ${cfg.color}22`
                                : "none",
                              transition: "all 300ms",
                            }}
                          >
                            <Icon
                              size={16}
                              style={{ color: done ? "#ffffff" : "#cbd5e1" }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "700",
                              textAlign: "center",
                              color: done ? cfg.color : "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div
                            style={{
                              flex: 1,
                              height: "2px",
                              background:
                                i < activeStep
                                  ? STATUS_CONFIG[STEPS[i + 1]]?.color
                                  : "#e2e8f0",
                              marginTop: "19px",
                              marginLeft: "0",
                              marginRight: "0",
                              transition: "background 400ms",
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Order summary */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Order Summary
                </p>
              </div>
              <div style={{ padding: "16px 20px" }}>
                {(order.items ?? []).map((item, i) => (
                  <div
                    key={item.id ?? i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom:
                        i < order.items?.length - 1
                          ? "1px solid #f8fafc"
                          : "none",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "13.5px",
                          fontWeight: "500",
                          color: "#0f172a",
                        }}
                      >
                        {item.name}
                      </p>
                      <p style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#0f172a",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtMoney(item.line_total, order.currency)}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: "14px",
                    borderTop: "2px solid #f1f5f9",
                    marginTop: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: "800",
                      color: "#0f172a",
                    }}
                  >
                    Total
                  </span>
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: "900",
                      color: "#0f172a",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {fmtMoney(order.grand_total, order.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status history timeline */}
            {(order.history ?? []).length > 0 && (
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "14px 20px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Status History
                  </p>
                </div>
                <div
                  style={{
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0",
                  }}
                >
                  {order.history.map((h, i) => {
                    const cfg = STATUS_CONFIG[h.to_status];
                    const Icon = cfg?.icon ?? Clock;
                    const isLast = i === order.history.length - 1;
                    return (
                      <div
                        key={h.id ?? i}
                        style={{
                          display: "flex",
                          gap: "14px",
                          position: "relative",
                        }}
                      >
                        {/* Timeline dot & line */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              background: cfg?.bg ?? "#f8fafc",
                              border: `2px solid ${cfg?.border ?? "#e2e8f0"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              zIndex: 1,
                            }}
                          >
                            <Icon
                              size={13}
                              style={{ color: cfg?.color ?? "#64748b" }}
                            />
                          </div>
                          {!isLast && (
                            <div
                              style={{
                                width: "2px",
                                flex: 1,
                                background: "#f1f5f9",
                                minHeight: "20px",
                                marginTop: "2px",
                              }}
                            />
                          )}
                        </div>
                        {/* Content */}
                        <div style={{ paddingBottom: isLast ? 0 : "20px" }}>
                          <p
                            style={{
                              fontSize: "13.5px",
                              fontWeight: "700",
                              color: cfg?.color ?? "#334155",
                              marginBottom: "2px",
                            }}
                          >
                            {cfg?.label ?? h.to_status}
                          </p>
                          {h.note && (
                            <p
                              style={{
                                fontSize: "12.5px",
                                color: "#64748b",
                                marginBottom: "2px",
                                fontStyle: "italic",
                              }}
                            >
                              "{h.note}"
                            </p>
                          )}
                          <p style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                            {fmtDateTime(h.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 540px) {
          .track-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
