"use client";

import { useState, useCallback } from "react";
import { Loader2, AlertCircle, Eye, EyeOff, Store } from "lucide-react";

export default function AdminLoginPage() {
  const [form, setForm] = useState({ storeSlug: "", email: "", password: "" });
  const [showPassword, setShowPwd] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);
      if (!form.storeSlug.trim())
        return setError("Store identifier is required.");
      if (!form.email.trim()) return setError("Email is required.");
      if (!form.password) return setError("Password is required.");

      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            storeSlug: form.storeSlug.trim().toLowerCase(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Invalid credentials.");
          return;
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_user", JSON.stringify(json.data.user));
          localStorage.setItem("admin_store_id", json.data.user.storeId ?? "");
          window.location.href = "/admin";
        }
      } catch (err) {
        console.error("[Login]", err);
        setError("A network error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [form],
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
      }}
    >
      {/* ── Left panel (hero) — hidden on mobile ───────────────────── */}
      <div
        style={{
          flex: "0 0 420px",
          background:
            "linear-gradient(160deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 40px",
          position: "relative",
          overflow: "hidden",
        }}
        className="login-hero"
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Brand */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <Store size={18} color="white" />
          </div>
          <div>
            <p
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "white",
                letterSpacing: "-0.01em",
              }}
            >
              PlatformHQ
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "rgba(255,255,255,0.45)",
                fontWeight: "500",
              }}
            >
              Admin Console
            </p>
          </div>
        </div>

        {/* Headline */}
        <div style={{ position: "relative" }}>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "white",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
              marginBottom: "12px",
            }}
          >
            Manage your store
            <br />
            with confidence.
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.6,
            }}
          >
            Full control over products, orders, analytics, integrations, and
            your team — all in one place.
          </p>

          {/* Feature pills */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "24px",
            }}
          >
            {[
              "📦 Products",
              "📊 Analytics",
              "💳 Payments",
              "🚚 Shipping",
              "👥 Team",
            ].map((f) => (
              <span
                key={f}
                style={{
                  padding: "4px 12px",
                  borderRadius: "99px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: "500",
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <p
          style={{
            position: "relative",
            fontSize: "11px",
            color: "rgba(255,255,255,0.25)",
          }}
        >
          © {new Date().getFullYear()} PlatformHQ. All rights reserved.
        </p>
      </div>

      {/* ── Right panel (form) ───────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "380px" }}>
          {/* Mobile logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "32px",
            }}
            className="login-mobile-brand"
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "#0f172a",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Store size={16} color="white" />
            </div>
            <span
              style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a" }}
            >
              PlatformHQ
            </span>
          </div>

          <h1
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "#0f172a",
              letterSpacing: "-0.025em",
              marginBottom: "6px",
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              fontSize: "13.5px",
              color: "#64748b",
              marginBottom: "28px",
            }}
          >
            Sign in to access your admin dashboard.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Store slug */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Store Identifier
              </label>
              <input
                type="text"
                name="storeSlug"
                value={form.storeSlug}
                onChange={handleChange}
                placeholder="onlinebdshop"
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: "100%",
                  padding: "10px 13px",
                  fontSize: "13px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  color: "#0f172a",
                  outline: "none",
                  fontFamily: "ui-monospace, monospace",
                  transition: "border-color 150ms, box-shadow 150ms",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#2563eb";
                  e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
                  e.target.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                  e.target.style.background = "#f8fafc";
                }}
              />
              <p
                style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}
              >
                Your store's unique URL slug
              </p>
            </div>

            {/* Email */}
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="admin@acme.com"
                autoComplete="email"
                style={{
                  width: "100%",
                  padding: "10px 13px",
                  fontSize: "13px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  color: "#0f172a",
                  outline: "none",
                  transition: "border-color 150ms, box-shadow 150ms",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#2563eb";
                  e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
                  e.target.style.background = "#fff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e2e8f0";
                  e.target.style.boxShadow = "none";
                  e.target.style.background = "#f8fafc";
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "6px",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: "100%",
                    padding: "10px 40px 10px 13px",
                    fontSize: "13px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: "8px",
                    background: "#f8fafc",
                    color: "#0f172a",
                    outline: "none",
                    transition: "border-color 150ms, box-shadow 150ms",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2563eb";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
                    e.target.style.background = "#fff";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
                    e.target.style.background = "#f8fafc";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  tabIndex={-1}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    padding: "2px",
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  padding: "10px 13px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  fontSize: "12.5px",
                  color: "#dc2626",
                }}
              >
                <AlertCircle
                  size={14}
                  style={{ flexShrink: 0, marginTop: "1px" }}
                />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "11px 20px",
                borderRadius: "9px",
                border: "none",
                background: isLoading
                  ? "#475569"
                  : "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "white",
                fontSize: "14px",
                fontWeight: "700",
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                letterSpacing: "-0.01em",
                boxShadow: "0 2px 4px rgba(15,23,42,0.2)",
                transition: "all 150ms",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 16px rgba(15,23,42,0.25)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow =
                  "0 2px 4px rgba(15,23,42,0.2)";
              }}
            >
              {isLoading ? (
                <>
                  <Loader2
                    size={15}
                    style={{ animation: "spin 0.75s linear infinite" }}
                  />
                  Signing in…
                </>
              ) : (
                "Sign In to Dashboard"
              )}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              fontSize: "11.5px",
              color: "#94a3b8",
              marginTop: "24px",
            }}
          >
            Access restricted to authorized store personnel only.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .login-hero        { display: none !important; }
          .login-mobile-brand { display: flex !important; }
        }
        @media (min-width: 769px) {
          .login-mobile-brand { display: none !important; }
        }
      `}</style>
    </div>
  );
}
