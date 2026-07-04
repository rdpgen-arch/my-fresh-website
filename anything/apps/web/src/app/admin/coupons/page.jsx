"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Tag,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { authFetch } from "@/utils/authFetch";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const EMPTY = {
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  minOrderValue: "",
  maxUses: "",
  expiresAt: "",
};

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  fontSize: "13px",
  border: "1.5px solid #e2e8f0",
  borderRadius: "8px",
  background: "#f8fafc",
  color: "#0f172a",
  outline: "none",
  transition: "border-color 150ms",
};

const onFocus = (e) => {
  e.target.style.borderColor = "#2563eb";
  e.target.style.background = "#fff";
};
const onBlur = (e) => {
  e.target.style.borderColor = "#e2e8f0";
  e.target.style.background = "#f8fafc";
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CouponsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const res = await authFetch("/api/coupons");
      if (!res.ok) throw new Error("Failed to load");
      return (await res.json()).data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/coupons", {
        method: "POST",
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          description: form.description || null,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : 0,
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create coupon.");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coupons"] });
      setForm(EMPTY);
      setShowForm(false);
      setFormError(null);
    },
    onError: (err) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await authFetch(`/api/coupons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      const res = await authFetch(`/api/coupons/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!res.ok) throw new Error("Toggle failed.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
  });

  const ch = useCallback(
    (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value })),
    [],
  );

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
            Coupons & Discounts
          </h1>
          <p style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
            {isLoading
              ? "Loading…"
              : `${coupons?.length ?? 0} coupon${coupons?.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "9px 18px",
            borderRadius: "9px",
            background: showForm
              ? "#f1f5f9"
              : "linear-gradient(135deg, #0f172a, #1e293b)",
            color: showForm ? "#475569" : "#ffffff",
            fontSize: "13px",
            fontWeight: "700",
            border: "none",
            cursor: "pointer",
            boxShadow: showForm ? "none" : "0 2px 4px rgba(15,23,42,0.2)",
          }}
        >
          {showForm ? (
            <>
              <X size={14} /> Close
            </>
          ) : (
            <>
              <Plus size={14} /> New Coupon
            </>
          )}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div
          style={{
            padding: "20px 28px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <h3
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: "#0f172a",
              marginBottom: "14px",
            }}
          >
            Create New Coupon
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            {[
              {
                label: "Code *",
                name: "code",
                placeholder: "SUMMER20",
                mono: true,
                style: { textTransform: "uppercase" },
              },
            ].map((f) => (
              <div key={f.name}>
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
                  {f.label}
                </label>
                <input
                  name={f.name}
                  value={form[f.name]}
                  onChange={ch}
                  placeholder={f.placeholder}
                  style={{
                    ...inputStyle,
                    fontFamily: f.mono ? "monospace" : "inherit",
                    ...f.style,
                  }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
            ))}
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
                Type *
              </label>
              <select
                name="discountType"
                value={form.discountType}
                onChange={ch}
                style={{ ...inputStyle, cursor: "pointer" }}
                onFocus={onFocus}
                onBlur={onBlur}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (৳)</option>
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
                Value *
              </label>
              <input
                name="discountValue"
                value={form.discountValue}
                onChange={ch}
                type="number"
                min="0"
                placeholder={form.discountType === "percentage" ? "20" : "100"}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
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
                Min Order (৳)
              </label>
              <input
                name="minOrderValue"
                value={form.minOrderValue}
                onChange={ch}
                type="number"
                min="0"
                placeholder="0"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
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
                Max Uses
              </label>
              <input
                name="maxUses"
                value={form.maxUses}
                onChange={ch}
                type="number"
                min="1"
                placeholder="Unlimited"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
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
                Expires At
              </label>
              <input
                name="expiresAt"
                value={form.expiresAt}
                onChange={ch}
                type="datetime-local"
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>
          <div style={{ marginBottom: "14px" }}>
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
              Description
            </label>
            <input
              name="description"
              value={form.description}
              onChange={ch}
              placeholder="Summer sale 20% off all items"
              style={{ ...inputStyle, width: "100%", maxWidth: "480px" }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
          {formError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#dc2626",
                fontSize: "12.5px",
                marginBottom: "12px",
              }}
            >
              <AlertCircle size={13} /> {formError}
            </div>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending || !form.code || !form.discountValue
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "9px 18px",
                borderRadius: "8px",
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontSize: "13px",
                fontWeight: "700",
                cursor:
                  createMutation.isPending || !form.code || !form.discountValue
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  createMutation.isPending || !form.code || !form.discountValue
                    ? 0.6
                    : 1,
              }}
            >
              {createMutation.isPending ? (
                <Loader2
                  size={13}
                  style={{ animation: "spin 0.75s linear infinite" }}
                />
              ) : (
                <CheckCircle2 size={13} />
              )}
              Create Coupon
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormError(null);
                setForm(EMPTY);
              }}
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
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {isLoading ? (
          <div
            style={{
              padding: "60px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "13px",
            }}
          >
            Loading coupons…
          </div>
        ) : !coupons?.length ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <Tag
              size={36}
              style={{
                color: "#e2e8f0",
                margin: "0 auto 12px",
                display: "block",
              }}
            />
            <p
              style={{ fontSize: "14px", fontWeight: "600", color: "#64748b" }}
            >
              No coupons yet
            </p>
            <p
              style={{ fontSize: "12.5px", color: "#94a3b8", marginTop: "4px" }}
            >
              Create your first coupon to offer discounts.
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "16px",
                padding: "9px 20px",
                borderRadius: "9px",
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              <Plus size={14} /> Create First Coupon
            </button>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "700px",
            }}
          >
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr
                style={{
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                {[
                  "Code",
                  "Type",
                  "Value",
                  "Min Order",
                  "Usage",
                  "Expires",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 16px",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                      textAlign: "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c, idx) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: "1px solid #f8fafc",
                    transition: "background 80ms",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8fafc")
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        fontFamily: "ui-monospace,monospace",
                        fontSize: "13px",
                        fontWeight: "800",
                        color: "#0f172a",
                      }}
                    >
                      {c.code}
                    </span>
                    {c.description && (
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#94a3b8",
                          marginTop: "1px",
                        }}
                      >
                        {c.description}
                      </p>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "12.5px",
                      color: "#475569",
                      textTransform: "capitalize",
                    }}
                  >
                    {c.discount_type}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "14px",
                      fontWeight: "800",
                      color: "#0f172a",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {c.discount_type === "percentage"
                      ? `${c.discount_value}%`
                      : `৳${c.discount_value}`}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "12.5px",
                      color: "#475569",
                    }}
                  >
                    {Number(c.min_order_value) > 0
                      ? `৳${c.min_order_value}`
                      : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          color: "#0f172a",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {c.uses_count}
                        {c.max_uses ? `/${c.max_uses}` : ""}
                      </span>
                      {c.max_uses && (
                        <div
                          style={{
                            height: "3px",
                            background: "#f1f5f9",
                            borderRadius: "99px",
                            width: "60px",
                            marginTop: "4px",
                          }}
                        >
                          <div
                            style={{
                              height: "3px",
                              width: `${Math.min(100, (c.uses_count / c.max_uses) * 100)}%`,
                              background: "#2563eb",
                              borderRadius: "99px",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "12.5px",
                      color: "#475569",
                    }}
                  >
                    {fmtDate(c.expires_at)}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: c.id,
                          isActive: c.is_active,
                        })
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 10px",
                        borderRadius: "99px",
                        fontSize: "11px",
                        fontWeight: "700",
                        border: `1px solid ${c.is_active ? "#bbf7d0" : "#e2e8f0"}`,
                        background: c.is_active ? "#f0fdf4" : "#f8fafc",
                        color: c.is_active ? "#16a34a" : "#94a3b8",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: c.is_active ? "#16a34a" : "#cbd5e1",
                        }}
                      />
                      {c.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this coupon?"))
                          deleteMutation.mutate(c.id);
                      }}
                      style={{
                        padding: "5px",
                        borderRadius: "7px",
                        border: "1.5px solid #fecaca",
                        background: "#fef2f2",
                        color: "#dc2626",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
