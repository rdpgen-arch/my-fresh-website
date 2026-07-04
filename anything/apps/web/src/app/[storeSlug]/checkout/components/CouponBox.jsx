import { useState } from "react";
import { Tag, Check, X, Loader2 } from "lucide-react";

export function CouponBox({ storeSlug, subtotal, onApply }) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const applyCoupon = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          storeSlug,
          orderSubtotal: subtotal,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Invalid coupon.");
      setApplied(j.data);
      onApply(j.data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const removeApplied = () => {
    setApplied(null);
    setCode("");
    setError(null);
    onApply(null);
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h2
        style={{
          fontSize: "0.9375rem",
          fontWeight: 700,
          color: "var(--c-text)",
          marginBottom: "0.875rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <Tag size={15} style={{ color: "var(--c-text-muted)" }} /> Coupon Code
      </h2>
      {applied ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 0.875rem",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Check size={14} style={{ color: "#16a34a" }} />
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#15803d",
              }}
            >
              "{applied.code}" applied —{" "}
              {applied.discount_type === "percentage"
                ? `${applied.discount_value}% off`
                : `৳${applied.discount_value} off`}
            </span>
          </div>
          <button
            onClick={removeApplied}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#15803d",
              display: "flex",
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="COUPON CODE"
            onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
            style={{
              flex: 1,
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              border: `1px solid ${error ? "#fecaca" : "var(--c-border)"}`,
              borderRadius: "8px",
              background: "var(--c-surface)",
              color: "var(--c-text)",
              outline: "none",
              fontFamily: "monospace",
              letterSpacing: "0.05em",
            }}
          />
          <button
            onClick={applyCoupon}
            disabled={loading || !code.trim()}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: "var(--c-primary)",
              color: "var(--c-primary-fg)",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              opacity: !code.trim() ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {loading ? <Loader2 size={14} className="sf-spin" /> : "Apply"}
          </button>
        </div>
      )}
      {error && (
        <p style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
          {error}
        </p>
      )}
      <style
        jsx
        global
      >{`@keyframes sf-spin{to{transform:rotate(360deg)}} .sf-spin{animation:sf-spin 0.8s linear infinite}`}</style>
    </div>
  );
}
