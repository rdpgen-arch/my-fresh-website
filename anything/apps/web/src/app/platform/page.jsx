"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  ShoppingCart,
  Globe,
} from "lucide-react";

const EMPTY_FORM = {
  name: "",
  slug: "",
  customDomain: "",
  adminEmail: "",
  adminPassword: "",
  adminName: "",
  currency: "BDT",
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

function hdr(secret) {
  return { "x-platform-secret": secret, "Content-Type": "application/json" };
}

export default function PlatformAdminPage() {
  const qc = useQueryClient();
  const [secret, setSecret] = useState(() =>
    typeof window !== "undefined" ? (sessionStorage.getItem("ps") ?? "") : "",
  );
  const [secretInput, setSecretInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [created, setCreated] = useState(null);

  const authenticate = useCallback(() => {
    if (!secretInput.trim()) return;
    setSecret(secretInput.trim());
    if (typeof window !== "undefined")
      sessionStorage.setItem("ps", secretInput.trim());
    setAuthenticated(true);
  }, [secretInput]);

  const {
    data: stores,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["platform-stores", secret],
    queryFn: async () => {
      const res = await fetch("/api/platform/stores", { headers: hdr(secret) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Access denied.");
      return json.data ?? [];
    },
    enabled: !!secret && authenticated,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/platform/stores", {
        method: "POST",
        headers: hdr(secret),
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create store.");
      return json.data;
    },
    onSuccess: (data) => {
      setCreated(data);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setFormError(null);
      qc.invalidateQueries({ queryKey: ["platform-stores"] });
    },
    onError: (err) => setFormError(err.message),
  });

  const ch = useCallback(
    (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value })),
    [],
  );
  const inputCls =
    "w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors";

  if (!authenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "2rem",
            width: "320px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "1.5rem",
            }}
          >
            <Store size={18} />
            <h1 style={{ fontSize: "0.9375rem", fontWeight: 700, margin: 0 }}>
              Platform Admin
            </h1>
          </div>
          <input
            type="password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && authenticate()}
            placeholder="Platform secret key"
            className={inputCls}
            style={{ marginBottom: "0.75rem" }}
          />
          <button
            onClick={authenticate}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "6px",
              background: "#0f172a",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Access Platform
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "2rem 1.25rem",
        }}
      >
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
                color: "#0f172a",
                margin: "0 0 4px",
              }}
            >
              PlatformHQ — Super Admin
            </h1>
            <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: 0 }}>
              {isLoading ? "Loading…" : `${stores?.length ?? 0} stores`}
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              background: "#0f172a",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.8125rem",
            }}
          >
            <Plus size={13} /> New Store
          </button>
        </div>

        {isError && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "0.75rem 1rem",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "6px",
              color: "#dc2626",
              marginBottom: "1rem",
              fontSize: "0.875rem",
            }}
          >
            <AlertCircle size={14} />
            Access denied. Check your platform secret.
          </div>
        )}

        {created && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              padding: "0.875rem 1rem",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "6px",
              marginBottom: "1rem",
            }}
          >
            <CheckCircle2
              size={16}
              style={{ color: "#16a34a", flexShrink: 0, marginTop: "2px" }}
            />
            <div style={{ fontSize: "0.875rem" }}>
              <p
                style={{ fontWeight: 600, color: "#15803d", margin: "0 0 4px" }}
              >
                Store created: {created.store?.slug}
              </p>
              <p style={{ color: "#166534", margin: 0 }}>
                Admin: {created.adminUser?.email}
              </p>
            </div>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "1.25rem",
              marginBottom: "1.25rem",
            }}
          >
            <h3
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "#0f172a",
                marginTop: 0,
                marginBottom: "1rem",
              }}
            >
              New Store
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              {[
                ["name", "Store Name", "Acme Corp"],
                ["slug", "URL Slug", "acme-corp"],
                ["customDomain", "Custom Domain (optional)", "shop.acme.com"],
                ["currency", "Currency", "BDT"],
                ["adminEmail", "Admin Email", "admin@acme.com"],
                ["adminName", "Admin Full Name", "Jane Smith"],
              ].map(([name, label, placeholder]) => (
                <div key={name}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "#64748b",
                      marginBottom: "4px",
                    }}
                  >
                    {label}
                  </label>
                  <input
                    name={name}
                    value={form[name]}
                    onChange={ch}
                    placeholder={placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "#64748b",
                  marginBottom: "4px",
                }}
              >
                Admin Password *
              </label>
              <input
                name="adminPassword"
                type="password"
                value={form.adminPassword}
                onChange={ch}
                className={inputCls}
              />
            </div>
            {formError && (
              <p
                style={{
                  fontSize: "0.8125rem",
                  color: "#dc2626",
                  marginBottom: "0.75rem",
                }}
              >
                {formError}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => createMutation.mutate()}
                disabled={
                  createMutation.isPending ||
                  !form.name ||
                  !form.slug ||
                  !form.adminEmail ||
                  !form.adminPassword
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  background: "#0f172a",
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                  opacity: createMutation.isPending ? 0.7 : 1,
                }}
              >
                {createMutation.isPending ? (
                  <Loader2 size={12} />
                ) : (
                  <CheckCircle2 size={12} />
                )}
                Create Store
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormError(null);
                  setForm(EMPTY_FORM);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#64748b",
                  cursor: "pointer",
                  fontSize: "0.8125rem",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stores list */}
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {isLoading &&
            [1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: "80px",
                  background: "#f1f5f9",
                  borderRadius: "8px",
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
          {(stores ?? []).map((s) => (
            <div
              key={s.id}
              style={{
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <p
                    style={{
                      fontWeight: 600,
                      color: "#0f172a",
                      margin: 0,
                      fontSize: "0.9375rem",
                    }}
                  >
                    {s.name}
                  </p>
                  <span
                    style={{
                      fontSize: "10px",
                      padding: "1px 6px",
                      borderRadius: "99px",
                      background: s.is_active ? "#dcfce7" : "#fee2e2",
                      color: s.is_active ? "#16a34a" : "#dc2626",
                      fontWeight: 600,
                    }}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    fontSize: "0.75rem",
                    color: "#64748b",
                  }}
                >
                  <span style={{ fontFamily: "monospace" }}>/{s.slug}</span>
                  {s.custom_domain && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <Globe size={10} />
                      {s.custom_domain}
                    </span>
                  )}
                  <span>Created {fmtDate(s.created_at)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1.25rem", flexShrink: 0 }}>
                {[
                  ["Users", s.user_count, Users],
                  ["Orders", s.order_count, ShoppingCart],
                ].map(([label, count, Icon]) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <p
                      style={{
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "#0f172a",
                        margin: "0 0 2px",
                      }}
                    >
                      {count}
                    </p>
                    <p
                      style={{ fontSize: "10px", color: "#94a3b8", margin: 0 }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!isLoading && !stores?.length && !isError && (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "#94a3b8",
                fontSize: "0.875rem",
              }}
            >
              No stores yet. Create your first one above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
