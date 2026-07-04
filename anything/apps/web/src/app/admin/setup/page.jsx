"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Store,
  Package,
  ShoppingBag,
  XCircle,
  ArrowRight,
} from "lucide-react";

const STEPS = [
  { id: "store", label: "Creating store & admin account" },
  { id: "shipping", label: "Setting up shipping zones" },
  { id: "coupons", label: "Adding promo coupons" },
  { id: "products", label: "Seeding 25 sample products" },
  { id: "orders", label: "Generating 40 dummy orders" },
];

export default function AdminSetupPage() {
  const [status, setStatus] = useState("idle"); // idle | running | done | conflict | error
  const [result, setResult] = useState(null);
  const [stepIdx, setStepIdx] = useState(-1);
  const [error, setError] = useState(null);

  async function runBootstrap() {
    setStatus("running");
    setStepIdx(0);
    setError(null);

    // Animate steps while waiting
    const stepTimer = setInterval(() => {
      setStepIdx((prev) => {
        if (prev < STEPS.length - 1) return prev + 1;
        clearInterval(stepTimer);
        return prev;
      });
    }, 1000);

    try {
      const res = await fetch("/api/admin/bootstrap", { method: "GET" });
      const json = await res.json();
      clearInterval(stepTimer);
      setStepIdx(STEPS.length - 1);

      if (res.status === 409) {
        setStatus("conflict");
        setResult(json);
        return;
      }
      if (!res.ok) throw new Error(json.message ?? "Bootstrap failed");

      setResult(json);
      setStatus("done");
    } catch (err) {
      clearInterval(stepTimer);
      console.error(err);
      setError(err.message ?? "Something went wrong");
      setStatus("error");
    }
  }

  // Auto-run on mount
  useEffect(() => {
    runBootstrap();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        padding: "24px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "28px 28px 0",
            borderBottom: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "linear-gradient(135deg, #0f172a, #1e3a5f)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Store size={20} color="white" />
            </div>
            <div>
              <p
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#0f172a",
                }}
              >
                PlatformHQ
              </p>
              <p style={{ fontSize: "11px", color: "#94a3b8" }}>
                First-time Store Setup
              </p>
            </div>
          </div>

          <h1
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: "#0f172a",
              letterSpacing: "-0.025em",
              marginBottom: "6px",
            }}
          >
            {status === "done"
              ? "🎉 Store is ready!"
              : status === "conflict"
                ? "⚡ Already set up!"
                : status === "error"
                  ? "❌ Setup failed"
                  : "Setting up your store…"}
          </h1>
          <p
            style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px" }}
          >
            {status === "done"
              ? "OnlineBdshop has been created with sample data."
              : status === "conflict"
                ? "The store 'onlinebdshop' already exists."
                : status === "error"
                  ? error
                  : "Please wait while we build your store environment."}
          </p>
        </div>

        {/* Steps */}
        {(status === "running" || status === "done") && (
          <div style={{ padding: "0 28px 8px" }}>
            {STEPS.map((step, i) => {
              const done =
                (i <= stepIdx && status !== "running") ||
                (status === "running" && i < stepIdx);
              const active = status === "running" && i === stepIdx;
              const pending = i > stepIdx && status === "running";
              return (
                <div
                  key={step.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px 0",
                    borderBottom:
                      i < STEPS.length - 1 ? "1px solid #f8fafc" : "none",
                  }}
                >
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: done
                        ? "#f0fdf4"
                        : active
                          ? "#eff6ff"
                          : "#f8fafc",
                      border: `1.5px solid ${done ? "#86efac" : active ? "#93c5fd" : "#e2e8f0"}`,
                    }}
                  >
                    {done ? (
                      <CheckCircle2 size={13} style={{ color: "#16a34a" }} />
                    ) : active ? (
                      <Loader2
                        size={12}
                        style={{
                          color: "#2563eb",
                          animation: "spin 0.75s linear infinite",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#cbd5e1",
                        }}
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: active ? "600" : "450",
                      color: done ? "#16a34a" : active ? "#0f172a" : "#94a3b8",
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Success result */}
        {status === "done" && result && (
          <div style={{ padding: "16px 28px 0" }}>
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "10px",
                padding: "14px 16px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#16a34a",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "8px",
                }}
              >
                Seeded
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: "8px",
                }}
              >
                {[
                  { label: "Products", value: result.seeded?.products },
                  { label: "Orders", value: result.seeded?.orders },
                  { label: "Coupons", value: result.seeded?.coupons },
                ].map((s) => (
                  <div key={s.label} style={{ textAlign: "center" }}>
                    <p
                      style={{
                        fontSize: "20px",
                        fontWeight: "800",
                        color: "#0f172a",
                      }}
                    >
                      {s.value}
                    </p>
                    <p style={{ fontSize: "11px", color: "#64748b" }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Login credentials */}
        {(status === "done" || status === "conflict") && (
          <div style={{ padding: "16px 28px 0" }}>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "14px 16px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "10px",
                }}
              >
                Admin Login Credentials
              </p>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "5px" }}
              >
                {[
                  { label: "Store Slug", value: "onlinebdshop", mono: true },
                  { label: "Email", value: "admin@acme.com" },
                  { label: "Password", value: "Secure123!" },
                ].map((c) => (
                  <div
                    key={c.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      {c.label}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#0f172a",
                        fontFamily: c.mono ? "monospace" : "inherit",
                      }}
                    >
                      {c.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        <div
          style={{
            padding: "20px 28px 28px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {(status === "done" || status === "conflict") && (
            <>
              <a
                href="/admin/login"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #0f172a, #1e293b)",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "700",
                  textDecoration: "none",
                  boxShadow: "0 2px 6px rgba(15,23,42,0.25)",
                }}
              >
                Go to Admin Login <ArrowRight size={14} />
              </a>
              <a
                href="/onlinebdshop"
                target="_blank"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "11px 20px",
                  borderRadius: "10px",
                  border: "1.5px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: "13.5px",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                <Package size={14} />
                View Storefront
              </a>
            </>
          )}
          {status === "error" && (
            <button
              onClick={runBootstrap}
              style={{
                padding: "12px 20px",
                borderRadius: "10px",
                border: "none",
                background: "#0f172a",
                color: "white",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Retry Setup
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
