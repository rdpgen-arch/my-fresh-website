"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  Package,
  CreditCard,
  Truck,
  AlertCircle,
  BarChart3,
  ArrowUpRight,
  Loader2,
  ShoppingBag,
  Download,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { authFetch } from "@/utils/authFetch";

// ─── Design tokens ────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  pending: "#d97706",
  processing: "#2563eb",
  shipped: "#7c3aed",
  delivered: "#16a34a",
  cancelled: "#dc2626",
  returned: "#64748b",
};

const CHART_PALETTE = [
  "#0f172a",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#f97316",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n) => `৳${Number(n ?? 0).toLocaleString("en-BD")}`;
const fmtK = (n) =>
  n >= 1_000_000
    ? `৳${(n / 1e6).toFixed(1)}M`
    : n >= 1_000
      ? `৳${(n / 1e3).toFixed(1)}K`
      : `৳${n}`;

// ─── CSV Export Helper ─────────────────────────────────────────────────────────

function downloadCSV(filename, rows) {
  const escape = (v) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s}"`
      : s;
  };
  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#0f172a",
        border: "none",
        borderRadius: "8px",
        padding: "8px 12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <p style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "4px" }}>
        {label}
      </p>
      <p style={{ fontSize: "14px", fontWeight: "800", color: "#ffffff" }}>
        {fmt(payload[0].value)}
      </p>
      {payload[1] && (
        <p style={{ fontSize: "11px", color: "#94a3b8" }}>
          {payload[1].value} orders
        </p>
      )}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, color, bg }) {
  return (
    <div
      style={{
        padding: "20px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </p>
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "9px",
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {Icon && <Icon size={15} style={{ color }} />}
        </div>
      </div>
      <p
        style={{
          fontSize: "26px",
          fontWeight: "900",
          color: "#0f172a",
          letterSpacing: "-0.03em",
          lineHeight: 1,
          marginBottom: "4px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value ?? "—"}
      </p>
      {sub && <p style={{ fontSize: "12px", color: "#64748b" }}>{sub}</p>}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children, isLoading }) {
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
          padding: "14px 18px",
          borderBottom: "1px solid #f1f5f9",
        }}
      >
        {Icon && <Icon size={14} style={{ color: "#64748b" }} />}
        <h3 style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: "16px 18px" }}>
        {isLoading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[80, 65, 75, 55, 70].map((w, i) => (
              <div
                key={i}
                style={{
                  height: "28px",
                  background: "#f1f5f9",
                  borderRadius: "6px",
                  width: `${w}%`,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period, setPeriod] = useState(7);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics", period],
    queryFn: async () => {
      const res = await authFetch(`/api/admin/analytics?period=${period}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load analytics.");
      return json.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const revenueByDay = data?.revenue_by_day ?? [];
  const totalRevenue = revenueByDay.reduce((s, d) => s + Number(d.revenue), 0);
  const totalOrders = revenueByDay.reduce((s, d) => s + Number(d.orders), 0);
  const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;
  const topProduct = data?.top_products?.[0];
  const statusData = data?.orders_by_status ?? [];
  const topProducts = data?.top_products ?? [];
  const payBreakdown = data?.payment_breakdown ?? [];
  const shipBreakdown = data?.shipping_breakdown ?? [];

  const handleExportCSV = () => {
    const dateStr = new Date().toISOString().slice(0, 10);

    // Sheet 1: Revenue by day
    const revenueRows = [
      ["Date", "Revenue (BDT)", "Orders"],
      ...revenueByDay.map((d) => [
        d.date,
        Number(d.revenue).toFixed(2),
        d.orders,
      ]),
      [],
      ["TOTAL", totalRevenue.toFixed(2), totalOrders],
    ];

    // Sheet 2: Top products
    const productRows = [
      ["Rank", "Product Name", "SKU", "Units Sold", "Revenue (BDT)"],
      ...topProducts.map((p, i) => [
        i + 1,
        p.name,
        p.sku,
        p.units_sold,
        Number(p.revenue).toFixed(2),
      ]),
    ];

    // Sheet 3: Payment breakdown
    const payRows = [
      ["Payment Method", "Orders", "Revenue (BDT)"],
      ...payBreakdown.map((p) => [
        p.method,
        p.count,
        Number(p.revenue).toFixed(2),
      ]),
    ];

    // Combine into one CSV with sections
    const allRows = [
      [`Analytics Report — Last ${period} Days — ${dateStr}`],
      [],
      ["=== REVENUE BY DAY ==="],
      ...revenueRows,
      [],
      ["=== TOP PRODUCTS ==="],
      ...productRows,
      [],
      ["=== PAYMENT METHODS ==="],
      ...payRows,
    ];

    downloadCSV(`analytics-${period}d-${dateStr}.csv`, allRows);
  };

  return (
    <div
      style={{
        padding: "28px 32px",
        maxWidth: "1200px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
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
            Analytics
          </h1>
          <p style={{ fontSize: "12.5px", color: "#64748b" }}>
            Store performance overview
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* Export CSV button */}
          <button
            onClick={handleExportCSV}
            disabled={isLoading || !data}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1.5px solid #e2e8f0",
              background: "#fff",
              color: "#475569",
              fontSize: "13px",
              fontWeight: "600",
              cursor: isLoading || !data ? "not-allowed" : "pointer",
              opacity: isLoading || !data ? 0.5 : 1,
            }}
          >
            <Download size={13} />
            Export CSV
          </button>

          {/* Period toggle */}
          <div
            style={{
              display: "flex",
              background: "#f1f5f9",
              borderRadius: "9px",
              padding: "3px",
              gap: "2px",
            }}
          >
            {[7, 30].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "7px 18px",
                  borderRadius: "7px",
                  border: "none",
                  background: period === p ? "#ffffff" : "transparent",
                  color: period === p ? "#0f172a" : "#64748b",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow:
                    period === p ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 150ms",
                }}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {isError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            marginBottom: "20px",
            color: "#dc2626",
            fontSize: "13px",
          }}
        >
          <AlertCircle size={15} /> Failed to load analytics. Please check your
          session.
        </div>
      )}

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <KPICard
          label="Total Revenue"
          value={isLoading ? "…" : fmt(totalRevenue)}
          sub={`Last ${period} days`}
          icon={TrendingUp}
          color="#2563eb"
          bg="#eff6ff"
        />
        <KPICard
          label="Total Orders"
          value={isLoading ? "…" : totalOrders.toLocaleString()}
          sub="Across all statuses"
          icon={ShoppingBag}
          color="#16a34a"
          bg="#f0fdf4"
        />
        <KPICard
          label="Avg. Order Value"
          value={isLoading ? "…" : fmt(avgOrder)}
          sub="Revenue ÷ orders"
          icon={BarChart3}
          color="#d97706"
          bg="#fffbeb"
        />
        <KPICard
          label="Top Product"
          value={
            isLoading
              ? "…"
              : (topProduct?.name?.split(" ").slice(0, 2).join(" ") ?? "—")
          }
          sub={topProduct ? `${topProduct.units_sold} units sold` : "No data"}
          icon={Package}
          color="#7c3aed"
          bg="#f5f3ff"
        />
      </div>

      {/* ── Charts grid ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
          gap: "20px",
        }}
      >
        {/* Revenue bar chart */}
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
              justifyContent: "space-between",
              padding: "14px 18px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={14} style={{ color: "#64748b" }} />
              <h3
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#0f172a",
                }}
              >
                Revenue — last {period} days
              </h3>
            </div>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              {fmt(totalRevenue)} total
            </span>
          </div>
          <div style={{ padding: "16px 18px" }}>
            {isLoading ? (
              <div
                style={{
                  height: "200px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={revenueByDay}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(d) => d.slice(5)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={fmtK}
                    width={52}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<CustomBarTooltip />}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#0f172a"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status pie chart */}
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
              padding: "14px 18px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <BarChart3 size={14} style={{ color: "#64748b" }} />
            <h3
              style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}
            >
              Orders by Status
            </h3>
          </div>
          <div style={{ padding: "16px 18px" }}>
            {isLoading ? (
              <div
                style={{
                  height: "160px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ) : statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      innerRadius={30}
                      paddingAngle={2}
                    >
                      {statusData.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] ?? "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginTop: "8px",
                  }}
                >
                  {statusData.map((s) => (
                    <div
                      key={s.status}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: STATUS_COLORS[s.status] ?? "#94a3b8",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "10.5px",
                          color: "#64748b",
                          textTransform: "capitalize",
                        }}
                      >
                        {s.status} ({s.count})
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: "13px",
                }}
              >
                No data yet
              </div>
            )}
          </div>
        </div>

        {/* Top products */}
        <SectionCard
          title="Top Products by Revenue"
          icon={Package}
          isLoading={isLoading}
        >
          {topProducts.length === 0 ? (
            <p
              style={{
                color: "#94a3b8",
                fontSize: "13px",
                textAlign: "center",
                padding: "20px 0",
              }}
            >
              No data yet.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "2px" }}
            >
              {topProducts.slice(0, 8).map((p, i) => (
                <div
                  key={p.sku ?? i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "9px 10px",
                    borderRadius: "8px",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8fafc")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#cbd5e1",
                      width: "18px",
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#0f172a",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </p>
                    <p style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {p.units_sold} units sold
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#0f172a",
                      fontVariantNumeric: "tabular-nums",
                      flexShrink: 0,
                    }}
                  >
                    {fmt(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Payment + Shipping */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <SectionCard
            title="Payment Methods"
            icon={CreditCard}
            isLoading={isLoading}
          >
            {payBreakdown.length === 0 ? (
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  textAlign: "center",
                  padding: "12px 0",
                }}
              >
                No data
              </p>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {payBreakdown.map((p, i) => (
                  <div
                    key={p.method}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: CHART_PALETTE[i % CHART_PALETTE.length],
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: "13px",
                        color: "#334155",
                        textTransform: "capitalize",
                        fontWeight: "500",
                      }}
                    >
                      {p.method}
                    </span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {p.count}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#0f172a",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmt(p.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Shipping Zones"
            icon={Truck}
            isLoading={isLoading}
          >
            {shipBreakdown.length === 0 ? (
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  textAlign: "center",
                  padding: "12px 0",
                }}
              >
                No data
              </p>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {shipBreakdown.map((z, i) => (
                  <div
                    key={z.zone}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background:
                          CHART_PALETTE[(i + 3) % CHART_PALETTE.length],
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontSize: "13px",
                        color: "#334155",
                        fontWeight: "500",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {z.zone ?? "Unknown"}
                    </span>
                    <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                      {z.count}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#0f172a",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmt(z.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        /* Charts grid: collapses to single column on mobile */
        @media (max-width: 1024px) {
          div[style*="minmax(0, 1.6fr)"] { grid-template-columns: 1fr !important; }
        }
        /* KPI grid: 2 columns on mobile, 4 on desktop */
        @media (max-width: 600px) {
          div[style*="minmax(190px, 1fr)"] { grid-template-columns: 1fr 1fr !important; }
        }
        /* Page padding: reduce on mobile */
        @media (max-width: 768px) {
          div[style*="padding: '28px 32px'"] { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
