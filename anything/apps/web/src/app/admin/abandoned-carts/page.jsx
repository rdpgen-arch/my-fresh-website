/**
 * Abandoned Carts Page — /admin/abandoned-carts
 * Task 5D: View and manage captured abandoned checkouts.
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import {
  ShoppingCart,
  Phone,
  Mail,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

function fmt(n, cur = "BDT") {
  const sym = cur === "BDT" ? "৳" : "$";
  return `${sym}${Number(n ?? 0).toLocaleString("en-BD")}`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AbandonedCartsPage() {
  const [days, setDays] = useState(7);
  const [recovered, setRecovered] = useState("false");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["abandoned-carts", days, recovered],
    queryFn: async () => {
      const res = await authFetch(
        `/api/admin/abandoned-carts?days=${days}&recovered=${recovered}&limit=100`,
      );
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      return json.data?.carts ?? [];
    },
    staleTime: 1000 * 60,
  });

  const carts = data ?? [];

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: "1200px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "var(--c-text)",
              marginBottom: "2px",
            }}
          >
            Abandoned Carts
          </h1>
          <p style={{ fontSize: "12px", color: "var(--c-text-muted)" }}>
            Customers who started checkout but didn't complete their order
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{
              padding: "0.375rem 0.5rem",
              fontSize: "12px",
              border: "1px solid var(--c-border)",
              borderRadius: "var(--radius-base)",
              background: "white",
              color: "var(--c-text)",
            }}
          >
            <option value={1}>Last 24h</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <select
            value={recovered}
            onChange={(e) => setRecovered(e.target.value)}
            style={{
              padding: "0.375rem 0.5rem",
              fontSize: "12px",
              border: "1px solid var(--c-border)",
              borderRadius: "var(--radius-base)",
              background: "white",
              color: "var(--c-text)",
            }}
          >
            <option value="false">Unrecovered</option>
            <option value="true">Recovered</option>
          </select>
          <button
            onClick={() => refetch()}
            style={{
              padding: "0.375rem 0.625rem",
              fontSize: "12px",
              border: "1px solid var(--c-border)",
              borderRadius: "var(--radius-base)",
              background: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "var(--c-text-muted)",
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { label: "Total", value: carts.length },
          {
            label: "Have Phone",
            value: carts.filter((c) => c.customer_phone).length,
          },
          {
            label: "Have Email",
            value: carts.filter((c) => c.customer_email).length,
          },
          {
            label: "Avg. Value",
            value: carts.length
              ? fmt(
                  carts.reduce((s, c) => s + Number(c.cart_total), 0) /
                    carts.length,
                )
              : "—",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "0.625rem 1rem",
              border: "1px solid var(--c-border)",
              borderRadius: "var(--radius-base)",
              background: "#fff",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                color: "var(--c-text-muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          border: "1px solid var(--c-border)",
          borderRadius: "var(--radius-base)",
          overflow: "hidden",
          background: "#fff",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr 1fr 80px 80px 100px",
            padding: "0.5rem 0.75rem",
            borderBottom: "1px solid var(--c-border)",
            background: "var(--c-surface)",
          }}
        >
          {[
            "Last Seen",
            "Customer",
            "Items",
            "Value",
            "Currency",
            "Contact",
          ].map((h) => (
            <span
              key={h}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--c-text-muted)",
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {isLoading && (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--c-text-muted)",
              fontSize: "13px",
            }}
          >
            Loading…
          </div>
        )}

        {!isLoading && carts.length === 0 && (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--c-text-muted)",
            }}
          >
            <ShoppingCart
              size={28}
              style={{
                margin: "0 auto 8px",
                color: "var(--c-border)",
                display: "block",
              }}
            />
            <p style={{ fontSize: "13px" }}>
              No abandoned carts in this period
            </p>
          </div>
        )}

        {carts.map((cart) => {
          const items = cart.cart_items ?? [];
          const itemsSummary =
            items
              .slice(0, 2)
              .map((i) => `${i.name} ×${i.quantity}`)
              .join(", ") +
            (items.length > 2 ? ` +${items.length - 2} more` : "");
          return (
            <div
              key={cart.id}
              style={{
                display: "grid",
                gridTemplateColumns: "160px 1fr 1fr 80px 80px 100px",
                padding: "0.625rem 0.75rem",
                borderBottom: "1px solid var(--c-border)",
                fontSize: "12.5px",
                alignItems: "center",
              }}
            >
              <span style={{ color: "var(--c-text-muted)", fontSize: "11px" }}>
                {timeAgo(cart.last_seen_at)}
              </span>
              <div>
                <p style={{ fontWeight: 500, color: "var(--c-text)" }}>
                  {cart.customer_name ?? (
                    <span style={{ color: "var(--c-text-muted)" }}>
                      Unknown
                    </span>
                  )}
                </p>
                {cart.source_url && (
                  <a
                    href={cart.source_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "10px",
                      color: "var(--c-text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                    }}
                  >
                    <ExternalLink size={9} />{" "}
                    {new URL(cart.source_url).pathname}
                  </a>
                )}
              </div>
              <span
                style={{
                  color: "var(--c-text-muted)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {itemsSummary || "—"}
              </span>
              <span
                style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
              >
                {fmt(cart.cart_total, cart.currency)}
              </span>
              <span style={{ color: "var(--c-text-muted)" }}>
                {cart.currency}
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {cart.customer_phone && (
                  <a
                    href={`https://wa.me/${cart.customer_phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      fontSize: "11px",
                      color: "#16a34a",
                      textDecoration: "none",
                    }}
                    title={cart.customer_phone}
                  >
                    <Phone size={11} />
                  </a>
                )}
                {cart.customer_email && (
                  <a
                    href={`mailto:${cart.customer_email}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      fontSize: "11px",
                      color: "var(--c-accent)",
                      textDecoration: "none",
                    }}
                    title={cart.customer_email}
                  >
                    <Mail size={11} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
