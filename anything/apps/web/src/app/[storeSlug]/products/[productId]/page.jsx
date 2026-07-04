"use client";
/**
 * Product Detail Page — Redesigned
 * Bengali CTAs · swipeable gallery · accordion details · sticky buy bar on mobile
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Package,
  ShoppingCart,
  Minus,
  Plus,
  Share2,
  Shield,
  Truck,
  RefreshCw,
  Star,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { useCartStore } from "@/utils/cartStore";
import { useAnalytics } from "@/utils/useAnalytics";

const fmtPrice = (price, currency = "BDT") => {
  const sym = currency === "BDT" ? "৳" : "$";
  return `${sym}${Number(price).toLocaleString("en-BD")}`;
};

// ─── Gallery ─────────────────────────────────────────────────────────────────

function Gallery({ images, name }) {
  const [idx, setIdx] = useState(0);
  const touchRef = useRef(null);
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);
  const img = images[idx];

  return (
    <div>
      <div
        style={{
          position: "relative",
          borderRadius: "16px",
          overflow: "hidden",
          background: "#f9fafb",
          aspectRatio: "1/1",
          marginBottom: "10px",
        }}
        onTouchStart={(e) => {
          touchRef.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (!touchRef.current) return;
          const d = touchRef.current - e.changedTouches[0].clientX;
          if (Math.abs(d) > 40) d > 0 ? next() : prev();
          touchRef.current = null;
        }}
      >
        {img ? (
          <img
            src={img}
            alt={name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: "16px",
            }}
            loading="eager"
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Package size={64} style={{ color: "#d1d5db" }} />
          </div>
        )}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.92)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={next}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.92)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <ChevronRight size={16} />
            </button>
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: "5px",
              }}
            >
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  style={{
                    width: i === idx ? "18px" : "6px",
                    height: "6px",
                    borderRadius: "99px",
                    background:
                      i === idx ? "var(--accent, #5B21B6)" : "rgba(0,0,0,0.2)",
                    border: "none",
                    cursor: "pointer",
                    transition: "width 200ms, background 200ms",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
          {images.map((im, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                flexShrink: 0,
                width: "64px",
                height: "64px",
                borderRadius: "10px",
                overflow: "hidden",
                border: `2.5px solid ${i === idx ? "var(--accent, #5B21B6)" : "#e5e7eb"}`,
                background: "#f9fafb",
                cursor: "pointer",
                padding: 0,
                transition: "border-color 150ms",
              }}
            >
              <img
                src={im}
                alt={`${name} ${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Variant chip ─────────────────────────────────────────────────────────────

function VariantChips({ attrKey, options, selected, onSelect }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <p
        style={{
          fontSize: "13px",
          fontWeight: "600",
          color: "#374151",
          marginBottom: "8px",
        }}
      >
        {attrKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}:{" "}
        <span style={{ color: "#111827" }}>{selected || ""}</span>
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
        {(options ?? []).map((opt) => {
          const active = String(opt) === String(selected);
          return (
            <button
              key={opt}
              onClick={() => onSelect(attrKey, String(opt))}
              style={{
                padding: "7px 16px",
                borderRadius: "9px",
                border: `2px solid ${active ? "var(--accent, #5B21B6)" : "#e5e7eb"}`,
                background: active ? "var(--accent-muted, #EDE9FE)" : "#fff",
                color: active ? "var(--accent, #5B21B6)" : "#374151",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 120ms",
              }}
            >
              {String(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Qty ─────────────────────────────────────────────────────────────────────

function Qty({ value, onChange, max }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: "1.5px solid #e5e7eb",
        borderRadius: "10px",
        overflow: "hidden",
        height: "44px",
        width: "fit-content",
      }}
    >
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        style={{
          width: "40px",
          height: "44px",
          border: "none",
          background: "#f9fafb",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#374151",
        }}
      >
        <Minus size={16} />
      </button>
      <span
        style={{
          width: "44px",
          textAlign: "center",
          fontSize: "15px",
          fontWeight: "700",
          color: "#111827",
          borderLeft: "1.5px solid #e5e7eb",
          borderRight: "1.5px solid #e5e7eb",
        }}
      >
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={{
          width: "40px",
          height: "44px",
          border: "none",
          background: "#f9fafb",
          cursor: value >= max ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#374151",
          opacity: value >= max ? 0.4 : 1,
        }}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

// ─── Trust ────────────────────────────────────────────────────────────────────

function Trust() {
  return (
    <div
      style={{
        display: "flex",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        marginBottom: "18px",
      }}
    >
      {[
        { icon: Truck, label: "ক্যাশ অন ডেলিভারি" },
        { icon: RefreshCw, label: "৭ দিনের রিটার্ন" },
        { icon: Shield, label: "অরিজিনাল" },
      ].map((t, i) => {
        const Icon = t.icon;
        return (
          <div
            key={t.label}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "5px",
              padding: "12px 6px",
              background: "#f9fafb",
              borderLeft: i > 0 ? "1px solid #e5e7eb" : "none",
              textAlign: "center",
            }}
          >
            <Icon size={16} style={{ color: "var(--accent, #5B21B6)" }} />
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: "600",
                color: "#374151",
              }}
            >
              {t.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Accordion ────────────────────────────────────────────────────────────────

function Acc({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #f3f4f6" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 0",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
          {title}
        </span>
        {open ? (
          <ChevronUp size={16} style={{ color: "#6b7280" }} />
        ) : (
          <ChevronDown size={16} style={{ color: "#6b7280" }} />
        )}
      </button>
      {open && (
        <div
          style={{
            paddingBottom: "16px",
            fontSize: "14px",
            color: "#4b5563",
            lineHeight: "1.7",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Stars ───────────────────────────────────────────────────────────────────

function Stars({ n = 5, sz = 14 }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={sz}
          fill={i <= n ? "#f59e0b" : "#e5e7eb"}
          stroke="none"
        />
      ))}
    </div>
  );
}

const REVIEWS = [
  {
    name: "Fatema Akter",
    date: "২ দিন আগে",
    rating: 5,
    text: "অসাধারণ প্রোডাক্ট! একদম অরিজিনাল এবং দ্রুত ডেলিভারি। পরিবারের সবাই খুশি।",
  },
  {
    name: "Rakib Hasan",
    date: "৫ দিন আগে",
    rating: 5,
    text: "Excellent quality. Delivered within 2 days to Dhaka. Will definitely order again.",
  },
  {
    name: "Sonia Rahman",
    date: "১ সপ্তাহ আগে",
    rating: 4,
    text: "খুব ভালো মান। দাম একটু বেশি কিন্তু কোয়ালিটির জন্য মানানসই।",
  },
];

// ─── Related ──────────────────────────────────────────────────────────────────

function Related({ storeSlug, productId }) {
  const { data = [] } = useQuery({
    queryKey: ["sf-related", storeSlug, productId],
    queryFn: async () => {
      const res = await fetch(
        `/api/storefront/${storeSlug}/products/${productId}/related`,
      );
      if (!res.ok) return [];
      return (await res.json()).data ?? [];
    },
    staleTime: 300000,
  });
  if (!data.length) return null;
  return (
    <div
      style={{
        marginTop: "48px",
        borderTop: "1px solid #f3f4f6",
        paddingTop: "32px",
      }}
    >
      <h2
        style={{
          fontSize: "18px",
          fontWeight: "700",
          color: "#111827",
          marginBottom: "16px",
        }}
      >
        আরও দেখুন
      </h2>
      <div
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          paddingBottom: "8px",
        }}
      >
        {data.slice(0, 6).map((p) => (
          <a
            key={p.id}
            href={`/${storeSlug}/products/${p.id}`}
            style={{ flexShrink: 0, width: "148px", textDecoration: "none" }}
          >
            <div
              style={{
                background: "#f9fafb",
                borderRadius: "12px",
                overflow: "hidden",
                aspectRatio: "1/1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "8px",
              }}
            >
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  loading="lazy"
                />
              ) : (
                <Package size={28} style={{ color: "#d1d5db" }} />
              )}
            </div>
            <p
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#111827",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {p.name}
            </p>
            <p
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "var(--accent, #5B21B6)",
                marginTop: "2px",
              }}
            >
              {fmtPrice(p.price, p.currency)}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductDetailPage({ params }) {
  const { storeSlug, productId } = params;
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState({});
  const [err, setErr] = useState("");
  const [cartState, setCartState] = useState("idle");
  const [descOpen, setDescOpen] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const analytics = useAnalytics(storeSlug);

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["sf-product", storeSlug, productId],
    queryFn: async () => {
      const res = await fetch(
        `/api/storefront/${storeSlug}/products/${productId}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Not found");
      return json.data;
    },
    staleTime: 300000,
  });

  useEffect(() => {
    if (product && analytics?.trackViewItem) analytics.trackViewItem(product);
  }, [product]);

  const handleSelect = (k, v) => {
    setSel((p) => ({ ...p, [k]: v }));
    setErr("");
  };

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    const attrs = product.dynamic_attributes ?? {};
    const missing = Object.entries(attrs)
      .filter(([, v]) => Array.isArray(v))
      .map(([k]) => k)
      .filter((k) => !sel[k]);
    if (missing.length) {
      setErr(`Please select: ${missing.join(", ")}`);
      return;
    }
    addItem(product, qty, sel);
    if (analytics?.trackAddToCart) analytics.trackAddToCart(product, qty, sel);
    setCartState("added");
    setTimeout(() => setCartState("idle"), 2500);
    setErr("");
  }, [product, qty, sel, addItem, analytics]);

  const handleBuyNow = useCallback(() => {
    handleAddToCart();
    setTimeout(() => {
      window.location.href = `/${storeSlug}/checkout`;
    }, 150);
  }, [handleAddToCart, storeSlug]);

  const handleShare = () => {
    if (!product) return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${product.name} — ${fmtPrice(product.price)} | ${url}`)}`,
      "_blank",
    );
  };

  if (isLoading) {
    return (
      <div
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 20px" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "40px",
          }}
          className="pd-skel"
        >
          <div
            style={{
              aspectRatio: "1/1",
              borderRadius: "16px",
              background:
                "linear-gradient(90deg,#f3f4f6 25%,#e9ebee 50%,#f3f4f6 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s infinite",
            }}
          />
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {[80, 50, 40, 30, 70, 100].map((w, i) => (
              <div
                key={i}
                style={{
                  height: i === 0 ? "30px" : "18px",
                  width: `${w}%`,
                  borderRadius: "6px",
                  background:
                    "linear-gradient(90deg,#f3f4f6 25%,#e9ebee 50%,#f3f4f6 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.4s infinite",
                }}
              />
            ))}
          </div>
        </div>
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}} @media(max-width:639px){.pd-skel{grid-template-columns:1fr!important}}`}</style>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        <Package size={48} style={{ color: "#d1d5db" }} />
        <p style={{ fontSize: "18px", fontWeight: "700", color: "#111827" }}>
          Product not found
        </p>
        <a
          href={`/${storeSlug}`}
          style={{
            color: "var(--accent, #5B21B6)",
            fontSize: "14px",
            fontWeight: "600",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <ArrowLeft size={15} /> Back to shop
        </a>
      </div>
    );
  }

  const attrs = product.dynamic_attributes ?? {};
  const selectors = Object.entries(attrs).filter(([, v]) => Array.isArray(v));
  const specAttrs = Object.entries(attrs).filter(([, v]) => !Array.isArray(v));
  const isOOS = product.stock_quantity === 0;
  const isLow = !isOOS && product.stock_quantity <= 10;
  const images = product.image_url ? [product.image_url] : [];
  const desc = product.description ?? "";
  const hasLongDesc = desc.length > 180;
  const comparePrice = Number(product.compare_at_price ?? 0);
  const price = Number(product.price ?? 0);
  const discount =
    comparePrice > price ? Math.round((1 - price / comparePrice) * 100) : 0;

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "16px 20px 100px",
      }}
    >
      {/* Breadcrumb */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "16px",
          fontSize: "12.5px",
        }}
      >
        <a
          href={`/${storeSlug}`}
          style={{
            color: "#6b7280",
            textDecoration: "none",
            fontWeight: "500",
          }}
        >
          Shop
        </a>
        <ChevronRight size={12} style={{ color: "#d1d5db" }} />
        <span style={{ color: "#111827", fontWeight: "500" }}>
          {product.name}
        </span>
      </nav>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "48px",
          alignItems: "start",
        }}
        className="pd-grid"
      >
        {/* Gallery */}
        <div style={{ position: "sticky", top: "76px" }}>
          <Gallery images={images} name={product.name} />
        </div>

        {/* Info */}
        <div>
          <p
            style={{
              fontSize: "11px",
              color: "#9ca3af",
              fontFamily: "monospace",
              marginBottom: "6px",
            }}
          >
            SKU: {product.sku}
          </p>

          <h1
            style={{
              fontSize: "clamp(20px, 3vw, 26px)",
              fontWeight: "800",
              color: "#111827",
              letterSpacing: "-0.025em",
              lineHeight: "1.2",
              marginBottom: "12px",
            }}
          >
            {product.name}
          </h1>

          {/* Price */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "14px",
            }}
          >
            <span
              style={{
                fontSize: "30px",
                fontWeight: "800",
                color: "var(--accent, #5B21B6)",
                letterSpacing: "-0.02em",
              }}
            >
              {fmtPrice(product.price, product.currency)}
            </span>
            {comparePrice > price && (
              <span
                style={{
                  fontSize: "18px",
                  color: "#9ca3af",
                  textDecoration: "line-through",
                  fontWeight: "500",
                }}
              >
                {fmtPrice(comparePrice, product.currency)}
              </span>
            )}
            {discount > 0 && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  background: "#fef2f2",
                  color: "#dc2626",
                  borderRadius: "99px",
                  padding: "2px 10px",
                }}
              >
                {discount}% off
              </span>
            )}
          </div>

          {/* Stock badge */}
          {isOOS ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "99px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "12.5px",
                fontWeight: "700",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#dc2626",
                }}
              />{" "}
              Out of Stock
            </div>
          ) : isLow ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "99px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                color: "#d97706",
                fontSize: "12.5px",
                fontWeight: "700",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#d97706",
                }}
              />{" "}
              মাত্র {product.stock_quantity} টি বাকি
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "99px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#16a34a",
                fontSize: "12.5px",
                fontWeight: "700",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#16a34a",
                }}
              />{" "}
              In Stock
            </div>
          )}

          {/* Short desc */}
          {desc && (
            <div style={{ marginBottom: "18px" }}>
              <p
                style={{
                  fontSize: "14px",
                  color: "#4b5563",
                  lineHeight: "1.7",
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  WebkitLineClamp: descOpen ? "unset" : 3,
                }}
              >
                {desc}
              </p>
              {hasLongDesc && (
                <button
                  onClick={() => setDescOpen((e) => !e)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent, #5B21B6)",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    padding: "3px 0",
                  }}
                >
                  {descOpen ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          {/* Variants */}
          {selectors.map(([k, v]) => (
            <VariantChips
              key={k}
              attrKey={k}
              options={v}
              selected={sel[k]}
              onSelect={handleSelect}
            />
          ))}

          {err && (
            <div
              style={{
                padding: "10px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#dc2626",
                fontSize: "13px",
                marginBottom: "14px",
              }}
            >
              ⚠️ {err}
            </div>
          )}

          {/* CTAs */}
          {!isOOS ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "12px",
                }}
              >
                <Qty
                  value={qty}
                  onChange={setQty}
                  max={product.stock_quantity}
                />
                <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                  {product.stock_quantity} available
                </span>
              </div>
              <button
                onClick={handleBuyNow}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "none",
                  background: "var(--accent, #5B21B6)",
                  color: "#fff",
                  fontSize: "16px",
                  fontWeight: "800",
                  cursor: "pointer",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  letterSpacing: "-0.01em",
                  transition: "opacity 150ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.88";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <Zap size={17} /> এখনই অর্ডার করুন
              </button>
              <button
                onClick={handleAddToCart}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  border: "2px solid var(--accent, #5B21B6)",
                  background:
                    cartState === "added"
                      ? "var(--accent-muted, #EDE9FE)"
                      : "#fff",
                  color: "var(--accent, #5B21B6)",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 150ms",
                }}
              >
                {cartState === "added" ? (
                  <>
                    <CheckCircle2 size={16} /> কার্টে যোগ হয়েছে!
                  </>
                ) : (
                  <>
                    <ShoppingCart size={15} /> কার্টে যোগ করুন
                  </>
                )}
              </button>
            </>
          ) : (
            <div
              style={{
                padding: "14px",
                borderRadius: "12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "14px",
                fontWeight: "600",
                textAlign: "center",
                marginBottom: "12px",
              }}
            >
              Currently Out of Stock
            </div>
          )}

          {/* Trust + delivery */}
          <div style={{ marginTop: "16px" }}>
            <Trust />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "11px 14px",
                background: "#f9fafb",
                borderRadius: "10px",
                marginBottom: "16px",
              }}
            >
              <Truck
                size={15}
                style={{ color: "var(--accent, #5B21B6)", flexShrink: 0 }}
              />
              <p style={{ fontSize: "13px", color: "#374151" }}>
                ঢাকায় ১–২ দিন, ঢাকার বাইরে ৩–৫ দিন।
              </p>
            </div>
          </div>

          {/* Share */}
          <button
            onClick={handleShare}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              background: "none",
              border: "1.5px solid #e5e7eb",
              borderRadius: "9px",
              padding: "8px 14px",
              color: "#6b7280",
              fontSize: "13px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            <Share2 size={13} /> Share on WhatsApp
          </button>

          {/* Accordions */}
          <div style={{ marginTop: "24px" }}>
            {desc && (
              <Acc title="সম্পূর্ণ বিবরণ">
                <p style={{ whiteSpace: "pre-line" }}>{desc}</p>
              </Acc>
            )}
            {specAttrs.length > 0 && (
              <Acc title="Specifications">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                  }}
                >
                  {specAttrs.map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        padding: "8px 10px",
                        background: "#f9fafb",
                        borderRadius: "7px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#9ca3af",
                          display: "block",
                          textTransform: "capitalize",
                        }}
                      >
                        {k}
                      </span>
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#111827",
                        }}
                      >
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </Acc>
            )}
            <Acc title="রিটার্ন পলিসি">
              <p>
                আমরা ৭ দিনের রিটার্ন গ্যারান্টি দিই। পণ্য অব্যবহৃত এবং মূল প্যাকেজিং সহ ফেরত
                দিতে হবে।
              </p>
            </Acc>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div
        style={{
          marginTop: "48px",
          borderTop: "1px solid #f3f4f6",
          paddingTop: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827" }}>
            কাস্টমার রিভিউ
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Stars n={5} sz={15} />
            <span
              style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}
            >
              5.0
            </span>
            <span style={{ fontSize: "13px", color: "#6b7280" }}>
              ({REVIEWS.length})
            </span>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "12px",
          }}
        >
          {REVIEWS.map((r, i) => (
            <div
              key={i}
              style={{
                padding: "16px",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "600",
                      color: "#111827",
                    }}
                  >
                    {r.name}
                  </p>
                  <p style={{ fontSize: "11.5px", color: "#9ca3af" }}>
                    {r.date}
                  </p>
                </div>
                <Stars n={r.rating} sz={13} />
              </div>
              <p
                style={{
                  fontSize: "13.5px",
                  color: "#4b5563",
                  lineHeight: "1.6",
                }}
              >
                {r.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Related storeSlug={storeSlug} productId={productId} />

      <style jsx global>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @media (max-width: 639px) {
          .pd-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .pd-grid > div:first-child { position: static !important; }
        }
      `}</style>
    </div>
  );
}
