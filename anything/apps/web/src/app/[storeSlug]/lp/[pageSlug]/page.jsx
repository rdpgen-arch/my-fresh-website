"use client";
/**
 * Landing Page — Public (no header/footer)
 * URL: /[storeSlug]/lp/[pageSlug]
 * Has embedded checkout form — zero friction, no redirects.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Star,
  Shield,
  Truck,
  RefreshCw,
  Check,
  ChevronDown,
  Package,
  Loader2,
  CheckCircle2,
  Phone,
  User,
  MapPin,
} from "lucide-react";
import { DISTRICTS, getUpazilas } from "@/data/bangladesh";

const fmt = (n, currency = "BDT") =>
  `${currency === "BDT" ? "৳" : "$"}${Number(n).toLocaleString("en-BD")}`;

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ n = 5, size = 14 }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= n ? "#f59e0b" : "#e5e7eb"}
          stroke="none"
        />
      ))}
    </div>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label
        style={{
          fontSize: "13px",
          fontWeight: "600",
          color: "#374151",
          display: "block",
          marginBottom: "5px",
        }}
      >
        {label}
        {required && <span style={{ color: "#dc2626" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const iStyle = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "10px",
  fontSize: "15px",
  color: "#111827",
  outline: "none",
  fontFamily: "inherit",
  background: "#fff",
  boxSizing: "border-box",
  transition: "border-color 120ms",
};
const onF = (e) => {
  e.target.style.borderColor = "var(--accent, #5B21B6)";
};
const onB = (e) => {
  e.target.style.borderColor = "#e5e7eb";
};

// ─── Embedded checkout form ───────────────────────────────────────────────────

function EmbeddedCheckout({ product, storeSlug, cta, pageSlug }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    district: "",
    upazila: "",
    address: "",
  });
  const [qty, setQty] = useState(1);
  const [payment, setPayment] = useState("cod");
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const upazilas = form.district ? getUpazilas(form.district) : [];
  const total = Number(product.price) * qty;

  // Fetch shipping zones
  const { data: zones = [] } = useQuery({
    queryKey: ["sf-zones-lp", storeSlug],
    queryFn: async () => {
      const res = await fetch(`/api/storefront/${storeSlug}/shipping-zones`);
      if (!res.ok) return [];
      return (await res.json()).data ?? [];
    },
    staleTime: 600000,
  });

  const [zoneId, setZoneId] = useState("");
  const selectedZone = zones.find((z) => z.id === zoneId);
  const shipping = Number(selectedZone?.delivery_charge ?? 0);
  const grand = total + shipping;

  const orderMut = useMutation({
    mutationFn: async () => {
      if (
        !form.name.trim() ||
        !form.phone.trim() ||
        !form.district ||
        !zoneId
      ) {
        throw new Error("Please fill in all required fields");
      }
      const res = await fetch(`/api/storefront/${storeSlug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.name,
          customerPhone: form.phone,
          customerAddress: {
            line1: form.address,
            district: form.district,
            upazila: form.upazila,
            country: "Bangladesh",
          },
          shippingZoneId: zoneId,
          paymentMethod: payment,
          source: "landing_page",
          notes: `Landing page: ${pageSlug}`,
          items: [
            { productId: product.id, quantity: qty, selectedAttributes: {} },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Order failed");
      return json.data;
    },
    onSuccess: (data) => {
      setDone(data);
    },
    onError: (e) => setError(e.message),
  });

  if (done) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "48px 24px",
          background: "#f0fdf4",
          borderRadius: "20px",
          border: "2px solid #bbf7d0",
        }}
      >
        <CheckCircle2
          size={56}
          style={{ color: "#16a34a", margin: "0 auto 16px", display: "block" }}
        />
        <h3
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          আপনার অর্ডার নেওয়া হয়েছে! 🎉
        </h3>
        <p style={{ fontSize: "15px", color: "#374151", marginBottom: "16px" }}>
          অর্ডার নম্বর:{" "}
          <strong style={{ fontFamily: "monospace" }}>
            #{done.order_number}
          </strong>
        </p>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>
          আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।
        </p>
      </div>
    );
  }

  return (
    <div
      id="checkout"
      style={{
        background: "#fff",
        borderRadius: "20px",
        border: "1.5px solid #e5e7eb",
        padding: "28px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
      }}
    >
      <h3
        style={{
          fontSize: "20px",
          fontWeight: "800",
          color: "#111827",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        🛒 এখনই অর্ডার করুন
      </h3>

      {/* Qty selector */}
      <Field label="পরিমাণ" required>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0",
            border: "1.5px solid #e5e7eb",
            borderRadius: "10px",
            overflow: "hidden",
            width: "fit-content",
          }}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setQty(n)}
              style={{
                width: "48px",
                height: "44px",
                border: "none",
                borderRight: n < 5 ? "1.5px solid #e5e7eb" : "none",
                background: qty === n ? "var(--accent, #5B21B6)" : "#fff",
                color: qty === n ? "#fff" : "#374151",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "all 120ms",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>

      <Field label="আপনার নাম" required>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name")(e.target.value)}
          placeholder="আপনার পুরো নাম"
          style={iStyle}
          onFocus={onF}
          onBlur={onB}
        />
      </Field>
      <Field label="মোবাইল নম্বর" required>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => set("phone")(e.target.value)}
          placeholder="01XXXXXXXXX"
          style={iStyle}
          onFocus={onF}
          onBlur={onB}
        />
      </Field>
      <Field label="জেলা" required>
        <select
          value={form.district}
          onChange={(e) => {
            set("district")(e.target.value);
            set("upazila")("");
          }}
          style={{ ...iStyle, cursor: "pointer" }}
          onFocus={onF}
          onBlur={onB}
        >
          <option value="">জেলা বেছে নিন…</option>
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>
      {upazilas.length > 0 && (
        <Field label="উপজেলা">
          <select
            value={form.upazila}
            onChange={(e) => set("upazila")(e.target.value)}
            style={{ ...iStyle, cursor: "pointer" }}
            onFocus={onF}
            onBlur={onB}
          >
            <option value="">উপজেলা বেছে নিন…</option>
            {upazilas.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="বিস্তারিত ঠিকানা">
        <input
          type="text"
          value={form.address}
          onChange={(e) => set("address")(e.target.value)}
          placeholder="গ্রাম/রাস্তা/বাড়ি নম্বর"
          style={iStyle}
          onFocus={onF}
          onBlur={onB}
        />
      </Field>

      {/* Shipping zone */}
      {zones.length > 0 && (
        <Field label="ডেলিভারি এরিয়া" required>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {zones.map((z) => (
              <label
                key={z.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 14px",
                  border: `1.5px solid ${zoneId === z.id ? "var(--accent, #5B21B6)" : "#e5e7eb"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  background:
                    zoneId === z.id ? "var(--accent-muted, #EDE9FE)" : "#fff",
                  transition: "all 120ms",
                }}
              >
                <input
                  type="radio"
                  checked={zoneId === z.id}
                  onChange={() => setZoneId(z.id)}
                  style={{ accentColor: "var(--accent, #5B21B6)" }}
                />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    {z.name}
                  </p>
                  {z.estimated_days && (
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>
                      {z.estimated_days}
                    </p>
                  )}
                </div>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#111827",
                  }}
                >
                  {Number(z.delivery_charge) === 0
                    ? "Free"
                    : fmt(z.delivery_charge)}
                </p>
              </label>
            ))}
          </div>
        </Field>
      )}

      {/* Payment */}
      <Field label="পেমেন্ট পদ্ধতি" required>
        <div style={{ display: "flex", gap: "8px" }}>
          {[{ key: "cod", label: "ক্যাশ অন ডেলিভারি", icon: "💵" }].map((pm) => (
            <label
              key={pm.key}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 14px",
                border: `1.5px solid ${payment === pm.key ? "var(--accent, #5B21B6)" : "#e5e7eb"}`,
                borderRadius: "10px",
                cursor: "pointer",
                background:
                  payment === pm.key ? "var(--accent-muted, #EDE9FE)" : "#fff",
              }}
            >
              <input
                type="radio"
                checked={payment === pm.key}
                onChange={() => setPayment(pm.key)}
                style={{ accentColor: "var(--accent, #5B21B6)" }}
              />
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                {pm.icon} {pm.label}
              </span>
            </label>
          ))}
        </div>
      </Field>

      {/* Summary */}
      <div
        style={{
          background: "#f9fafb",
          borderRadius: "12px",
          padding: "14px 16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "6px",
          }}
        >
          <span style={{ fontSize: "13.5px", color: "#6b7280" }}>
            পণ্য ({qty}টি)
          </span>
          <span
            style={{ fontSize: "13.5px", fontWeight: "600", color: "#111827" }}
          >
            {fmt(total)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <span style={{ fontSize: "13.5px", color: "#6b7280" }}>
            ডেলিভারি চার্জ
          </span>
          <span
            style={{ fontSize: "13.5px", fontWeight: "600", color: "#111827" }}
          >
            {shipping === 0 ? "Free" : fmt(shipping)}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "10px",
          }}
        >
          <span
            style={{ fontSize: "15px", fontWeight: "700", color: "#111827" }}
          >
            মোট
          </span>
          <span
            style={{
              fontSize: "18px",
              fontWeight: "800",
              color: "var(--accent, #5B21B6)",
            }}
          >
            {fmt(grand)}
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "9px",
            color: "#dc2626",
            fontSize: "13.5px",
            marginBottom: "14px",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={() => orderMut.mutate()}
        disabled={orderMut.isPending}
        style={{
          width: "100%",
          padding: "17px",
          borderRadius: "12px",
          border: "none",
          background: "var(--accent, #5B21B6)",
          color: "#fff",
          fontSize: "17px",
          fontWeight: "800",
          cursor: orderMut.isPending ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          opacity: orderMut.isPending ? 0.75 : 1,
          letterSpacing: "-0.01em",
        }}
      >
        {orderMut.isPending ? (
          <Loader2
            size={20}
            style={{ animation: "spin 0.75s linear infinite" }}
          />
        ) : null}
        {cta ?? "এখনই অর্ডার করুন"} — {fmt(grand)}
      </button>
      <p
        style={{
          textAlign: "center",
          fontSize: "12px",
          color: "#9ca3af",
          marginTop: "10px",
        }}
      >
        🔒 নিরাপদ অর্ডার · ক্যাশ অন ডেলিভারি
      </p>
    </div>
  );
}

// ─── Guarantee Section ────────────────────────────────────────────────────────

function Guarantee() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid #e5e7eb",
        borderRadius: "16px",
        padding: "24px",
        marginBottom: "24px",
      }}
    >
      <h3
        style={{
          fontSize: "17px",
          fontWeight: "700",
          color: "#111827",
          textAlign: "center",
          marginBottom: "18px",
        }}
      >
        আমাদের গ্যারান্টি
      </h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
        }}
        className="guarantee-grid"
      >
        {[
          { icon: RefreshCw, title: "৭ দিনের রিটার্ন", sub: "সন্তুষ্ট না হলে ফেরত" },
          { icon: Truck, title: "ক্যাশ অন ডেলিভারি", sub: "পাওয়ার পর পেমেন্ট" },
          { icon: Shield, title: "অরিজিনাল প্রোডাক্ট", sub: "১০০% গুণমান নিশ্চিত" },
        ].map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.title} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "var(--accent-muted, #EDE9FE)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 8px",
                }}
              >
                <Icon size={20} style={{ color: "var(--accent, #5B21B6)" }} />
              </div>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#111827",
                  marginBottom: "2px",
                }}
              >
                {g.title}
              </p>
              <p style={{ fontSize: "11.5px", color: "#6b7280" }}>{g.sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage({ params }) {
  const { storeSlug, pageSlug } = params;

  const { data: storeConfig, isLoading: configLoading } = useQuery({
    queryKey: ["store-config", storeSlug],
    queryFn: async () => {
      const res = await fetch(`/api/storefront/${storeSlug}/config`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Store not found");
      return json.data;
    },
    staleTime: 300000,
  });

  const lpConfig = storeConfig?.themeConfig?.landing_pages?.find(
    (p) => p.slug === pageSlug,
  );

  const { data: product } = useQuery({
    queryKey: ["lp-product", lpConfig?.product_id],
    queryFn: async () => {
      const res = await fetch(
        `/api/storefront/${storeSlug}/products/${lpConfig.product_id}`,
      );
      const json = await res.json();
      if (!res.ok) return null;
      return json.data;
    },
    enabled: !!lpConfig?.product_id,
    staleTime: 300000,
  });

  if (configLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          size={28}
          style={{
            animation: "spin 0.8s linear infinite",
            color: "var(--accent, #5B21B6)",
          }}
        />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!lpConfig || !lpConfig.is_active) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        <Package size={48} style={{ color: "#d1d5db" }} />
        <p style={{ fontSize: "18px", fontWeight: "700", color: "#111827" }}>
          Page not found
        </p>
        <a
          href={`/${storeSlug}`}
          style={{
            fontSize: "14px",
            color: "var(--accent, #5B21B6)",
            textDecoration: "none",
            fontWeight: "600",
          }}
        >
          ← Back to shop
        </a>
      </div>
    );
  }

  const bullets = (lpConfig.bullets ?? []).filter(Boolean);
  const orderCount =
    lpConfig.orders_count ?? Math.floor(Math.random() * 80) + 50;

  return (
    <div
      style={{
        background: "#f9fafb",
        minHeight: "100vh",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Store header - minimal */}
      <div
        style={{
          background: "#0f172a",
          padding: "10px 20px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.7)",
            fontWeight: "500",
          }}
        >
          {storeConfig?.name ?? storeSlug} · ক্যাশ অন ডেলিভারি · সারা বাংলাদেশে ডেলিভারি
        </p>
      </div>

      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "32px 20px 60px",
        }}
      >
        {/* Hero section */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
            alignItems: "start",
            marginBottom: "32px",
          }}
          className="lp-grid"
        >
          {/* Left — Product info */}
          <div>
            {/* Product image */}
            <div
              style={{
                borderRadius: "20px",
                overflow: "hidden",
                background: "#fff",
                border: "1px solid #e5e7eb",
                aspectRatio: "1/1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "24px",
              }}
            >
              {product?.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Package size={80} style={{ color: "#d1d5db" }} />
              )}
            </div>

            {/* Social proof */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <Stars n={5} size={16} />
              <span
                style={{
                  fontSize: "13.5px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                5.0 · {orderCount} জন অর্ডার করেছেন এই সপ্তাহে
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: "clamp(22px, 4vw, 34px)",
                fontWeight: "900",
                color: "#111827",
                letterSpacing: "-0.025em",
                lineHeight: "1.2",
                marginBottom: "12px",
              }}
            >
              {lpConfig.headline}
            </h1>

            {/* Subheadline */}
            {lpConfig.subheadline && (
              <p
                style={{
                  fontSize: "16px",
                  color: "#4b5563",
                  lineHeight: "1.65",
                  marginBottom: "20px",
                }}
              >
                {lpConfig.subheadline}
              </p>
            )}

            {/* Bullets */}
            {bullets.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  marginBottom: "24px",
                }}
              >
                {bullets.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: "var(--accent, #5B21B6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: "1px",
                      }}
                    >
                      <Check size={13} color="#fff" strokeWidth={3} />
                    </div>
                    <p
                      style={{
                        fontSize: "14.5px",
                        color: "#374151",
                        lineHeight: "1.5",
                        fontWeight: "500",
                      }}
                    >
                      {b}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Price */}
            {product && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "24px",
                }}
              >
                <span
                  style={{
                    fontSize: "32px",
                    fontWeight: "900",
                    color: "var(--accent, #5B21B6)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {fmt(product.price, product.currency)}
                </span>
                {Number(product.compare_at_price ?? 0) >
                  Number(product.price) && (
                  <span
                    style={{
                      fontSize: "20px",
                      color: "#9ca3af",
                      textDecoration: "line-through",
                    }}
                  >
                    {fmt(product.compare_at_price, product.currency)}
                  </span>
                )}
              </div>
            )}

            <a
              href="#checkout"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "15px 28px",
                borderRadius: "12px",
                background: "var(--accent, #5B21B6)",
                color: "#fff",
                fontSize: "16px",
                fontWeight: "800",
                textDecoration: "none",
                boxShadow: "0 4px 16px rgba(91,33,182,0.4)",
                transition: "opacity 150ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.88";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              {lpConfig.cta_text ?? "এখনই অর্ডার করুন"} ↓
            </a>
          </div>

          {/* Right — Checkout form (desktop) */}
          <div className="lp-checkout-desktop">
            {product && (
              <EmbeddedCheckout
                product={product}
                storeSlug={storeSlug}
                cta={lpConfig.cta_text}
                pageSlug={pageSlug}
              />
            )}
          </div>
        </div>

        <Guarantee />

        {/* Mobile checkout */}
        <div className="lp-checkout-mobile" style={{ marginTop: "24px" }}>
          {product && (
            <EmbeddedCheckout
              product={product}
              storeSlug={storeSlug}
              cta={lpConfig.cta_text}
              pageSlug={pageSlug}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{ background: "#0f172a", padding: "20px", textAlign: "center" }}
      >
        <p style={{ fontSize: "12.5px", color: "#475569" }}>
          © {new Date().getFullYear()} {storeConfig?.name ?? storeSlug}. All
          rights reserved.
        </p>
      </div>

      <style jsx global>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @media (max-width: 768px) {
          .lp-grid { grid-template-columns: 1fr !important; }
          .lp-checkout-desktop { display: none !important; }
          .guarantee-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .lp-checkout-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
