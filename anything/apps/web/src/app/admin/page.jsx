"use client";

import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import {
  TrendingUp,
  Package,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Zap,
  Tag,
  Users,
  AlertTriangle,
  Loader2,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n, cur = "BDT") {
  const sym = cur === "BDT" ? "৳" : "$";
  return `${sym}${Number(n ?? 0).toLocaleString("en-BD")}`;
}
function pct(n, total) {
  if (!total) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  processing: {
    label: "Processing",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
  },
  shipped: {
    label: "Shipped",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
  },
  delivered: {
    label: "Delivered",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  cancelled: {
    label: "Cancelled",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  returned: {
    label: "Returned",
    color: "#64748b",
    bg: "#f8fafc",
    border: "#e2e8f0",
  },
};

function StatusPill({ status }) {
  const s = STATUS_CONFIG[status] ?? {
    label: status,
    color: "#64748b",
    bg: "#f8fafc",
    border: "#e2e8f0",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "99px",
        fontSize: "11px",
        fontWeight: "600",
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        letterSpacing: "0.01em",
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

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg = "#eff6ff",
  iconColor = "#2563eb",
  href,
  trend,
}) {
  const card = (
    <div
      style={{
        padding: "20px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        transition: "box-shadow 150ms, transform 150ms",
        cursor: href ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        if (href) {
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Icon && (
            <Icon size={17} style={{ color: iconColor }} strokeWidth={2} />
          )}
        </div>
        {href && <ArrowUpRight size={14} style={{ color: "#cbd5e1" }} />}
      </div>
      <div>
        <p
          style={{
            fontSize: "11px",
            fontWeight: "600",
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "4px",
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: "26px",
            fontWeight: "800",
            color: "#0f172a",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            marginBottom: "4px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value ?? "—"}
        </p>
        {sub && <p style={{ fontSize: "11.5px", color: "#64748b" }}>{sub}</p>}
      </div>
    </div>
  );
  return href ? (
    <a href={href} style={{ textDecoration: "none" }}>
      {card}
    </a>
  ) : (
    card
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, href, hrefLabel = "View all" }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "10px",
      }}
    >
      <h2
        style={{
          fontSize: "14px",
          fontWeight: "700",
          color: "#0f172a",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      {href && (
        <a
          href={href}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            color: "#2563eb",
            textDecoration: "none",
            fontWeight: "500",
            padding: "3px 8px",
            borderRadius: "6px",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          {hrefLabel} <ArrowRight size={11} />
        </a>
      )}
    </div>
  );
}

// ── Table wrapper ─────────────────────────────────────────────────────────────

function DataTable({ children }) {
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
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).data;
    },
    refetchInterval: 30000,
  });

  const { data: analytics } = useQuery({
    queryKey: ["admin-analytics-summary"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/analytics?period=7");
      if (!res.ok) return null;
      return (await res.json()).data;
    },
    staleTime: 1000 * 60 * 2,
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const res = await authFetch(
        "/api/orders?limit=8&sortBy=created_at&sortDir=desc",
      );
      if (!res.ok) return [];
      return (await res.json()).data ?? [];
    },
    refetchInterval: 30000,
  });

  const { data: stockAlerts } = useQuery({
    queryKey: ["admin-stock-alerts"],
    queryFn: async () => {
      const res = await authFetch("/api/products?status=published&limit=100");
      if (!res.ok) return [];
      return ((await res.json()).data ?? [])
        .filter((p) => p.stock_quantity <= 5)
        .slice(0, 6);
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: storeData } = useQuery({
    queryKey: ["admin-store-meta"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/store");
      if (!res.ok) return null;
      return (await res.json()).data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const currency = storeData?.currency ?? "BDT";
  const revenueByDay = analytics?.revenue_by_day ?? [];
  const weekRevenue = revenueByDay.reduce((s, d) => s + Number(d.revenue), 0);
  const weekOrders = revenueByDay.reduce((s, d) => s + d.orders, 0);
  const byStatus = Object.fromEntries(
    (analytics?.orders_by_status ?? []).map((r) => [r.status, Number(r.count)]),
  );
  const totalOrders = Object.values(byStatus).reduce((a, b) => a + b, 0);

  const today = new Date().toLocaleDateString("en-BD", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ padding: "28px 32px", maxWidth: "1280px" }}>
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: "#0f172a",
              letterSpacing: "-0.025em",
              marginBottom: "3px",
            }}
          >
            Dashboard
          </h1>
          <p style={{ fontSize: "12.5px", color: "#64748b" }}>{today}</p>
        </div>
        <a
          href="/admin/orders/new"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            borderRadius: "8px",
            background: "var(--accent, #5B21B6)",
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: "600",
            textDecoration: "none",
            boxShadow: "0 2px 6px rgba(91,33,182,0.3)",
          }}
        >
          <ShoppingBag size={14} />
          New Order
        </a>
      </div>

      {statsLoading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#64748b",
            fontSize: "13px",
            padding: "40px 0",
          }}
        >
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />{" "}
          Loading dashboard…
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* ── KPI grid ──────────────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            <KPICard
              label="Today's Revenue"
              value={fmt(stats?.today_revenue ?? 0, currency)}
              sub={`${stats?.today_orders ?? 0} orders today`}
              icon={TrendingUp}
              iconBg="#eff6ff"
              iconColor="#2563eb"
              href="/admin/analytics"
            />
            <KPICard
              label="7-Day Revenue"
              value={fmt(weekRevenue, currency)}
              sub={`${weekOrders} orders this week`}
              icon={BarChart3}
              iconBg="#f0fdf4"
              iconColor="#16a34a"
              href="/admin/analytics"
            />
            <KPICard
              label="Pending Orders"
              value={byStatus.pending ?? 0}
              sub="Awaiting confirmation"
              icon={Clock}
              iconBg="#fffbeb"
              iconColor="#d97706"
              href="/admin/orders?status=pending"
            />
            <KPICard
              label="Delivered"
              value={byStatus.delivered ?? 0}
              sub={pct(byStatus.delivered, totalOrders) + " success rate"}
              icon={CheckCircle2}
              iconBg="#f0fdf4"
              iconColor="#16a34a"
              href="/admin/orders?status=delivered"
            />
            <KPICard
              label="Cancelled"
              value={byStatus.cancelled ?? 0}
              sub={pct(byStatus.cancelled, totalOrders) + " cancel rate"}
              icon={XCircle}
              iconBg="#fef2f2"
              iconColor="#dc2626"
              href="/admin/orders?status=cancelled"
            />
            <KPICard
              label="Low Stock"
              value={stockAlerts?.length ?? 0}
              sub="Products ≤5 units left"
              icon={Package}
              iconBg="#fff7ed"
              iconColor="#ea580c"
              href="/admin/products"
            />
          </div>

          {/* ── Content grid ──────────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)",
              gap: "24px",
            }}
          >
            {/* ── Left column ─────────────────────────────────────────── */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {/* Recent orders */}
              <div>
                <SectionHeader title="Recent Orders" href="/admin/orders" />
                <DataTable>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "120px 1fr 100px 100px",
                      padding: "8px 16px",
                      borderBottom: "1px solid #f1f5f9",
                      background: "#f8fafc",
                    }}
                  >
                    {["Order #", "Customer", "Total", "Status"].map((h, i) => (
                      <span
                        key={h}
                        style={{
                          fontSize: "10.5px",
                          fontWeight: "700",
                          color: "#94a3b8",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          textAlign: i >= 2 ? "right" : "left",
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  {!recentOrders?.length ? (
                    <div
                      style={{
                        padding: "40px",
                        textAlign: "center",
                        color: "#94a3b8",
                        fontSize: "13px",
                      }}
                    >
                      No orders yet
                    </div>
                  ) : (
                    recentOrders.map((o, i) => (
                      <div
                        key={o.id}
                        onClick={() =>
                          (window.location.href = `/admin/orders/${o.id}`)
                        }
                        style={{
                          display: "grid",
                          gridTemplateColumns: "120px 1fr 100px 100px",
                          padding: "11px 16px",
                          borderBottom:
                            i < recentOrders.length - 1
                              ? "1px solid #f1f5f9"
                              : "none",
                          alignItems: "center",
                          cursor: "pointer",
                          transition: "background 100ms",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f8fafc")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "")
                        }
                      >
                        <span
                          style={{
                            fontFamily: "ui-monospace,monospace",
                            fontSize: "11px",
                            color: "#64748b",
                            fontWeight: "500",
                          }}
                        >
                          {o.order_number}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "500",
                            color: "#0f172a",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            paddingRight: "12px",
                          }}
                        >
                          {o.customer_name}
                        </span>
                        <span
                          style={{
                            textAlign: "right",
                            fontSize: "13px",
                            fontWeight: "700",
                            color: "#0f172a",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmt(o.grand_total, o.currency ?? currency)}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          <StatusPill status={o.status} />
                        </div>
                      </div>
                    ))
                  )}
                </DataTable>
              </div>

              {/* Order status breakdown */}
              <div>
                <SectionHeader
                  title="Order Breakdown (7 days)"
                  href="/admin/orders"
                  hrefLabel="All orders"
                />
                <DataTable>
                  {Object.entries(STATUS_CONFIG).map(([key, s], i, arr) => {
                    const count = byStatus[key] ?? 0;
                    const share = totalOrders ? count / totalOrders : 0;
                    return (
                      <a
                        key={key}
                        href={`/admin/orders?status=${key}`}
                        style={{ textDecoration: "none", display: "block" }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "110px 1fr 48px 52px",
                            padding: "10px 16px",
                            borderBottom:
                              i < arr.length - 1 ? "1px solid #f1f5f9" : "none",
                            alignItems: "center",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#f8fafc")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "")
                          }
                        >
                          <StatusPill status={key} />
                          <div
                            style={{
                              height: "4px",
                              background: "#f1f5f9",
                              borderRadius: "99px",
                              margin: "0 12px",
                            }}
                          >
                            <div
                              style={{
                                height: "4px",
                                width: `${(share * 100).toFixed(1)}%`,
                                background: s.color,
                                borderRadius: "99px",
                                transition: "width 600ms ease",
                              }}
                            />
                          </div>
                          <span
                            style={{
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                              fontSize: "13px",
                              fontWeight: "700",
                              color: "#0f172a",
                            }}
                          >
                            {count}
                          </span>
                          <span
                            style={{
                              textAlign: "right",
                              fontSize: "11px",
                              color: "#94a3b8",
                            }}
                          >
                            {pct(count, totalOrders)}
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </DataTable>
              </div>
            </div>

            {/* ── Right column ─────────────────────────────────────────── */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {/* Stock alerts */}
              <div>
                <SectionHeader title="Stock Alerts" href="/admin/products" />
                <DataTable>
                  {!stockAlerts?.length ? (
                    <div style={{ padding: "32px 16px", textAlign: "center" }}>
                      <CheckCircle2
                        size={20}
                        style={{
                          color: "#22c55e",
                          margin: "0 auto 8px",
                          display: "block",
                        }}
                      />
                      <p style={{ fontSize: "13px", color: "#64748b" }}>
                        All products well stocked
                      </p>
                    </div>
                  ) : (
                    stockAlerts.map((p, i) => (
                      <div
                        key={p.id}
                        onClick={() =>
                          (window.location.href = `/admin/products/${p.id}`)
                        }
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 14px",
                          borderBottom:
                            i < stockAlerts.length - 1
                              ? "1px solid #f1f5f9"
                              : "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#f8fafc")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "")
                        }
                      >
                        <AlertTriangle
                          size={13}
                          style={{
                            color:
                              p.stock_quantity === 0 ? "#dc2626" : "#d97706",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: "12.5px",
                              fontWeight: "500",
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.name}
                          </p>
                          <p
                            style={{
                              fontSize: "11px",
                              color: "#94a3b8",
                              fontFamily: "monospace",
                            }}
                          >
                            {p.sku}
                          </p>
                        </div>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "800",
                            color:
                              p.stock_quantity === 0 ? "#dc2626" : "#d97706",
                            background:
                              p.stock_quantity === 0 ? "#fef2f2" : "#fffbeb",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {p.stock_quantity === 0 ? "OUT" : p.stock_quantity}
                        </span>
                      </div>
                    ))
                  )}
                </DataTable>
              </div>

              {/* Quick actions */}
              <div>
                <SectionHeader title="Quick Actions" />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {[
                    {
                      label: "Add Product",
                      sub: "SKU, price, attributes",
                      href: "/admin/products/new",
                      icon: Package,
                      color: "#2563eb",
                      bg: "#eff6ff",
                    },
                    {
                      label: "Manage Coupons",
                      sub: "Discounts & promo codes",
                      href: "/admin/coupons",
                      icon: Tag,
                      color: "#7c3aed",
                      bg: "#f5f3ff",
                    },
                    {
                      label: "Invite Team Member",
                      sub: "Staff access & permissions",
                      href: "/admin/users",
                      icon: Users,
                      color: "#16a34a",
                      bg: "#f0fdf4",
                    },
                    {
                      label: "Setup Integrations",
                      sub: "bKash, Nagad, SSLCommerz",
                      href: "/admin/integrations",
                      icon: Zap,
                      color: "#d97706",
                      bg: "#fffbeb",
                    },
                    {
                      label: "View Analytics",
                      sub: "Revenue & conversions",
                      href: "/admin/analytics",
                      icon: BarChart3,
                      color: "#0891b2",
                      bg: "#ecfeff",
                    },
                  ].map((a) => {
                    const Icon = a.icon;
                    return (
                      <a
                        key={a.href}
                        href={a.href}
                        style={{ textDecoration: "none" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 14px",
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                            transition: "all 150ms",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(0,0,0,0.08)";
                            e.currentTarget.style.transform =
                              "translateY(-1px)";
                            e.currentTarget.style.borderColor = "#cbd5e1";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow =
                              "0 1px 2px rgba(0,0,0,0.03)";
                            e.currentTarget.style.transform = "";
                            e.currentTarget.style.borderColor = "#e2e8f0";
                          }}
                        >
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              background: a.bg,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={15} style={{ color: a.color }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#0f172a",
                                marginBottom: "1px",
                              }}
                            >
                              {a.label}
                            </p>
                            <p style={{ fontSize: "11.5px", color: "#64748b" }}>
                              {a.sub}
                            </p>
                          </div>
                          <ArrowRight size={13} style={{ color: "#cbd5e1" }} />
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          div[style*="gridTemplateColumns: minmax(0,1.6fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
