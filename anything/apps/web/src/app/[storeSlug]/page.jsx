"use client";
/**
 * Storefront Homepage — Spatial Design v2
 *
 * Sections:
 *  ① Bento Grid Hero
 *  ② Fluid Category Navigation (sticky pill strip)
 *  ③ Horizontal scroll product sections (Flash Sale / Trending / New Arrivals)
 *  ④ Main product catalog — borderless cards
 *  ⑤ Trust Signals — minimalist SVG icons + bKash/Nagad/COD
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Check, ShoppingCart, ArrowRight } from "lucide-react";
import { useStore, useLang } from "./layout";
import { useCartStore } from "@/utils/cartStore";
import { useAnalytics } from "@/utils/useAnalytics";

const fmt = (n, cur = "BDT") =>
  `${cur === "BDT" ? "৳" : "$"}${Number(n).toLocaleString("en-BD")}`;

// ═══════════════════════════════════════════════════════
//  BORDERLESS PRODUCT CARD
// ═══════════════════════════════════════════════════════

function ProductCard({ product, storeSlug }) {
  const addItem = useCartStore((s) => s.addItem);
  const analytics = useAnalytics(storeSlug);
  const [added, setAdded] = useState(false);
  const [hover, setHover] = useState(false);
  const { t } = useLang();

  const isOOS = product.stock_quantity === 0;
  const isLow = !isOOS && product.stock_quantity <= 5;
  const compare = Number(product.compare_at_price ?? 0);
  const price = Number(product.price ?? 0);
  const discount =
    compare > price ? Math.round((1 - price / compare) * 100) : 0;

  const quickAdd = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOOS) return;
      addItem(product, 1, {});
      if (analytics?.trackAddToCart) analytics.trackAddToCart(product, 1, {});
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    },
    [product, addItem, analytics, isOOS],
  );

  return (
    <a
      href={`/${storeSlug}/products/${product.id}`}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Image — no border, pure photo */}
        <div
          style={{
            position: "relative",
            borderRadius: "16px",
            overflow: "hidden",
            background: "var(--sf-surface, #FFFFFF)",
            aspectRatio: "1/1",
            transition: "transform 280ms cubic-bezier(0.4,0,0.2,1)",
            transform: hover ? "scale(1.015)" : "scale(1)",
          }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transition: "transform 420ms cubic-bezier(0.4,0,0.2,1)",
                transform: hover ? "scale(1.05)" : "scale(1)",
              }}
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
              <Package
                size={36}
                style={{
                  color: "var(--sf-border, rgba(0,0,0,0.1))",
                  opacity: 0.5,
                }}
              />
            </div>
          )}

          {/* Badges */}
          {discount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                background: "var(--sf-accent, #4F46E5)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: "800",
                padding: "3px 8px",
                borderRadius: "999px",
              }}
            >
              -{discount}%
            </span>
          )}
          {isOOS && (
            <span
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "rgba(0,0,0,0.55)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: "700",
                padding: "3px 8px",
                borderRadius: "999px",
              }}
            >
              {t.outOfStock}
            </span>
          )}
          {isLow && !isOOS && (
            <span
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "rgba(217,119,6,0.92)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: "700",
                padding: "3px 8px",
                borderRadius: "999px",
              }}
            >
              {t.lowStock.replace("{n}", product.stock_quantity)}
            </span>
          )}

          {/* Hover quick-add — slides up */}
          <button
            onClick={quickAdd}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "14px",
              background: added ? "rgba(22,163,74,0.9)" : "rgba(17,24,39,0.8)",
              backdropFilter: "blur(8px)",
              color: "#fff",
              border: "none",
              cursor: isOOS ? "not-allowed" : "pointer",
              fontSize: "13px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              transform: hover ? "translateY(0)" : "translateY(100%)",
              opacity: hover ? 1 : 0,
              transition:
                "transform 230ms cubic-bezier(0.4,0,0.2,1), opacity 230ms, background 200ms",
              fontFamily: "var(--sf-font)",
            }}
          >
            {added ? (
              <>
                <Check size={14} /> {t.addedToCart}
              </>
            ) : (
              <>
                <ShoppingCart size={13} /> {t.addToCart}
              </>
            )}
          </button>
        </div>

        {/* Product info — no card border */}
        <div style={{ paddingTop: "12px" }}>
          {/* COD badge — conversion booster */}
          <span
            style={{
              display: "inline-block",
              fontSize: "10px",
              fontWeight: "700",
              color: "#16A34A",
              border: "1px solid rgba(22,163,74,0.25)",
              background: "rgba(22,163,74,0.06)",
              padding: "2px 7px",
              borderRadius: "999px",
              marginBottom: "6px",
            }}
          >
            ✓ {t.codAvailable}
          </span>

          <p
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "var(--sf-text, #111827)",
              lineHeight: "1.35",
              marginBottom: "6px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.name}
          </p>

          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span
              style={{
                fontSize: "16px",
                fontWeight: "800",
                color: "var(--sf-accent, #4F46E5)",
                letterSpacing: "-0.015em",
              }}
            >
              {fmt(product.price, product.currency)}
            </span>
            {compare > price && (
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--sf-text2, #6B7280)",
                  textDecoration: "line-through",
                }}
              >
                {fmt(compare, product.currency)}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

// ═══════════════════════════════════════════════════════
//  SECTION HEADER
// ═══════════════════════════════════════════════════════

function SectionHeader({ title, href }) {
  const { t } = useLang();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: "24px",
      }}
    >
      <h2
        style={{
          fontSize: "clamp(20px,3vw,26px)",
          fontWeight: "800",
          color: "var(--sf-text, #111827)",
          letterSpacing: "-0.025em",
          fontFamily: "var(--sf-font-heading)",
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
            fontSize: "13.5px",
            color: "var(--sf-accent, #4F46E5)",
            textDecoration: "none",
            fontWeight: "600",
            transition: "gap 160ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.gap = "8px";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.gap = "4px";
          }}
        >
          {t.seeAll} <ArrowRight size={14} />
        </a>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  BENTO HERO
// ═══════════════════════════════════════════════════════

function BentoHero({ config, storeSlug }) {
  const { t } = useLang();
  const tc = config?.themeConfig ?? {};
  const heading = tc.hero_heading || config?.name || "আজকের সেরা অফার";
  const sub =
    tc.hero_subheading || "অরিজিনাল পণ্য · ক্যাশ অন ডেলিভারি · দ্রুত ডেলিভারি";
  const heroImg = tc.hero_image_url;
  const promoImg1 = tc.bento_img_1;
  const promoImg2 = tc.bento_img_2;
  const promoText1 = tc.bento_text_1 || t.newArrivals;
  const promoText2 = tc.bento_text_2 || t.trending;

  return (
    <div
      style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 20px 52px" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.45fr 1fr",
          gap: "14px",
        }}
        className="bento-grid"
      >
        {/* Main hero block */}
        <div
          style={{
            gridRow: "span 2",
            borderRadius: "24px",
            overflow: "hidden",
            background: "var(--sf-text, #111827)",
            position: "relative",
            minHeight: "420px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "36px",
          }}
          className="bento-main"
        >
          {heroImg && (
            <img
              src={heroImg}
              alt="Hero"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.4,
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to top, rgba(0,0,0,0.75) 30%, rgba(0,0,0,0.08) 100%)",
            }}
          />
          <div style={{ position: "relative", zIndex: 2 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                fontSize: "11px",
                fontWeight: "700",
                color: "rgba(255,255,255,0.8)",
                marginBottom: "14px",
                letterSpacing: "0.04em",
              }}
            >
              🚀 {t.freeDelivery}
            </div>
            <h1
              style={{
                fontSize: "clamp(22px,3.5vw,40px)",
                fontWeight: "900",
                color: "#fff",
                letterSpacing: "-0.03em",
                lineHeight: "1.12",
                marginBottom: "12px",
                fontFamily: "var(--sf-font-heading)",
              }}
            >
              {heading}
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "rgba(255,255,255,0.62)",
                lineHeight: "1.65",
                marginBottom: "24px",
                maxWidth: "380px",
              }}
            >
              {sub}
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <a
                href={`/${storeSlug}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "13px 24px",
                  borderRadius: "14px",
                  background: "var(--sf-accent, #4F46E5)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "800",
                  textDecoration: "none",
                  transition: "opacity 150ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "0.88";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                {t.shop} <ArrowRight size={15} />
              </a>
              <a
                href={`/${storeSlug}/track`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "13px 20px",
                  borderRadius: "14px",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: "14px",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                {t.trackOrder}
              </a>
            </div>
          </div>
        </div>

        {/* Promo 1 — light */}
        <div
          style={{
            borderRadius: "20px",
            overflow: "hidden",
            background: "var(--sf-surface, #fff)",
            border: "1px solid var(--sf-border, rgba(0,0,0,0.06))",
            minHeight: "196px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "28px",
            position: "relative",
            cursor: "pointer",
          }}
          onClick={() => {
            window.location.href = `/${storeSlug}`;
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--sf-bg, #FAFAFA)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--sf-surface, #fff)";
          }}
        >
          {promoImg1 && (
            <img
              src={promoImg1}
              alt="Promo"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.15,
              }}
            />
          )}
          <div style={{ position: "relative" }}>
            <p
              style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "var(--sf-accent, #4F46E5)",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {t.newArrivals}
            </p>
            <p
              style={{
                fontSize: "clamp(17px,2.5vw,22px)",
                fontWeight: "800",
                color: "var(--sf-text, #111827)",
                letterSpacing: "-0.02em",
                lineHeight: "1.2",
                fontFamily: "var(--sf-font-heading)",
              }}
            >
              {promoText1}
            </p>
          </div>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "var(--sf-accent, #4F46E5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ArrowRight size={19} color="#fff" />
          </div>
        </div>

        {/* Promo 2 — dark */}
        <div
          style={{
            borderRadius: "20px",
            overflow: "hidden",
            background: "var(--sf-text, #111827)",
            minHeight: "196px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "28px",
            position: "relative",
            cursor: "pointer",
          }}
          onClick={() => {
            window.location.href = `/${storeSlug}`;
          }}
        >
          {promoImg2 && (
            <img
              src={promoImg2}
              alt="Promo 2"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.3,
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(135deg, rgba(0,0,0,0.55), rgba(0,0,0,0.18))",
            }}
          />
          <div style={{ position: "relative" }}>
            <p
              style={{
                fontSize: "11.5px",
                fontWeight: "700",
                color: "rgba(255,255,255,0.55)",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {t.trending}
            </p>
            <p
              style={{
                fontSize: "clamp(17px,2.5vw,22px)",
                fontWeight: "800",
                color: "#fff",
                letterSpacing: "-0.02em",
                lineHeight: "1.2",
                fontFamily: "var(--sf-font-heading)",
              }}
            >
              {promoText2}
            </p>
          </div>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <ArrowRight size={19} color="#fff" />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 639px) {
          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-main { grid-row: span 1 !important; min-height: 320px !important; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  FLUID CATEGORY NAV
// ═══════════════════════════════════════════════════════

function CategoryNav({ categories, activeCat, setActiveCat }) {
  const { t } = useLang();
  if (!categories?.length) return null;
  return (
    <div
      style={{
        background: "var(--sf-bg, #FAFAFA)",
        position: "sticky",
        top: "78px",
        zIndex: 30,
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 20px" }}>
        <div
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            padding: "14px 0",
            scrollbarWidth: "none",
          }}
        >
          {[
            { id: "__all__", name: t.allProducts, slug: "", icon: null },
            ...categories,
          ].map((cat) => {
            const active = activeCat === (cat.slug || "");
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.slug || "")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 18px",
                  borderRadius: "999px",
                  flexShrink: 0,
                  border: `1.5px solid ${active ? "var(--sf-accent, #4F46E5)" : "var(--sf-border, rgba(0,0,0,0.07))"}`,
                  background: active
                    ? "var(--sf-accent, #4F46E5)"
                    : "var(--sf-surface, #FFFFFF)",
                  color: active ? "#fff" : "var(--sf-text2, #6B7280)",
                  fontSize: "13px",
                  fontWeight: active ? "700" : "500",
                  cursor: "pointer",
                  transition: "all 160ms cubic-bezier(0.4,0,0.2,1)",
                  fontFamily: "var(--sf-font)",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor = "var(--sf-text2)";
                    e.currentTarget.style.color = "var(--sf-text)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.borderColor =
                      "var(--sf-border, rgba(0,0,0,0.07))";
                    e.currentTarget.style.color = "var(--sf-text2)";
                  }
                }}
              >
                {cat.icon && (
                  <span style={{ fontSize: "14px" }}>{cat.icon}</span>
                )}
                {cat.name}
              </button>
            );
          })}
        </div>
        <div
          style={{
            height: "1px",
            background: "var(--sf-border, rgba(0,0,0,0.06))",
          }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  TRUST SIGNALS
// ═══════════════════════════════════════════════════════

function TrustSignals() {
  const { t } = useLang();
  const items = [
    {
      svg: (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <rect
            width="30"
            height="30"
            rx="15"
            fill="var(--sf-accent-alpha, rgba(79,70,229,0.1))"
          />
          <path
            d="M8 15l4.5 4.5 9.5-9.5"
            stroke="var(--sf-accent, #4F46E5)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      title: t.original,
      sub: "Every product verified",
    },
    {
      svg: (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <rect width="30" height="30" rx="15" fill="rgba(22,163,74,0.1)" />
          <rect
            x="7"
            y="12"
            width="16"
            height="10"
            rx="2"
            stroke="#16A34A"
            strokeWidth="2"
          />
          <path d="M11 12V10a4 4 0 018 0v2" stroke="#16A34A" strokeWidth="2" />
          <circle cx="15" cy="17" r="1.5" fill="#16A34A" />
        </svg>
      ),
      title: t.cod,
      sub: "Pay when it arrives",
    },
    {
      svg: (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <rect width="30" height="30" rx="15" fill="rgba(226,19,110,0.1)" />
          <text x="5" y="20" fontSize="13" fontWeight="900" fill="#E2136E">
            bK
          </text>
        </svg>
      ),
      title: "bKash",
      sub: "Mobile banking",
    },
    {
      svg: (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <rect width="30" height="30" rx="15" fill="rgba(255,102,0,0.1)" />
          <text x="4" y="20" fontSize="11" fontWeight="900" fill="#FF6600">
            NGD
          </text>
        </svg>
      ),
      title: "Nagad",
      sub: "Digital wallet",
    },
    {
      svg: (
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
          <rect width="30" height="30" rx="15" fill="rgba(79,70,229,0.08)" />
          <path
            d="M8 15l4 4 10-10"
            stroke="var(--sf-accent, #4F46E5)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 8h14"
            stroke="var(--sf-accent, #4F46E5)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M8 22h14"
            stroke="var(--sf-accent, #4F46E5)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      title: t.returns,
      sub: "No questions asked",
    },
  ];

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 20px" }}>
      <div
        style={{
          display: "flex",
          borderRadius: "20px",
          overflow: "hidden",
          border: "1px solid var(--sf-border, rgba(0,0,0,0.06))",
          background: "var(--sf-surface, #FFFFFF)",
        }}
        className="trust-strip"
      >
        {items.map((item, i) => (
          <div
            key={item.title}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              padding: "28px 14px",
              borderLeft:
                i > 0 ? "1px solid var(--sf-border, rgba(0,0,0,0.06))" : "none",
              textAlign: "center",
            }}
            className="trust-col"
          >
            {item.svg}
            <div>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "var(--sf-text, #111827)",
                  marginBottom: "2px",
                }}
              >
                {item.title}
              </p>
              <p
                style={{ fontSize: "11px", color: "var(--sf-text2, #6B7280)" }}
              >
                {item.sub}
              </p>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @media(max-width:639px){
          .trust-strip { flex-direction: column; }
          .trust-col { flex-direction: row; text-align: left; border-left: none !important; border-top: 1px solid var(--sf-border, rgba(0,0,0,0.06)); padding: 16px 18px; }
          .trust-col + .trust-col { border-top: 1px solid var(--sf-border, rgba(0,0,0,0.06)); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  HORIZONTAL SCROLL PRODUCT STRIP
// ═══════════════════════════════════════════════════════

function ProductStrip({ title, products, storeSlug, href }) {
  const { t } = useLang();
  if (!products?.length) return null;
  return (
    <section>
      <div
        style={{ maxWidth: "1280px", margin: "0 auto", padding: "52px 20px 0" }}
      >
        <SectionHeader title={title} href={href} />
      </div>
      <div style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            gap: "18px",
            padding: "0 20px 12px",
            overflowX: "auto",
            scrollbarWidth: "none",
            maxWidth: "1280px",
            margin: "0 auto",
          }}
        >
          {products.slice(0, 8).map((p) => (
            <div key={p.id} style={{ width: "210px", flexShrink: 0 }}>
              <ProductCard product={p} storeSlug={storeSlug} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════
//  MAIN PRODUCT CATALOG
// ═══════════════════════════════════════════════════════

function ProductCatalog({ storeSlug, activeCat }) {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [dSearch, setDSearch] = useState("");
  const [page, setPage] = useState(1);
  const debRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("search");
      if (q) {
        setSearch(q);
        setDSearch(q);
      }
    }
  }, []);

  const handleSearch = useCallback((e) => {
    setSearch(e.target.value);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => {
      setDSearch(e.target.value);
      setPage(1);
    }, 350);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeCat]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sf-products", storeSlug, dSearch, page, activeCat],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "24" });
      if (dSearch) p.set("search", dSearch);
      if (activeCat) p.set("category", activeCat);
      const res = await fetch(`/api/storefront/${storeSlug}/products?${p}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    staleTime: 120000,
  });

  const products = data?.data ?? [];
  const totalPages = data?.meta?.pages ?? 1;
  const totalCount = data?.meta?.total ?? 0;

  return (
    <section
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "52px 20px 80px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(20px,3vw,26px)",
            fontWeight: "800",
            color: "var(--sf-text, #111827)",
            letterSpacing: "-0.025em",
            fontFamily: "var(--sf-font-heading)",
          }}
        >
          {activeCat ? t.allProducts : t.allProducts}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            value={search}
            onChange={handleSearch}
            placeholder={t.search}
            style={{
              padding: "9px 18px",
              borderRadius: "999px",
              border: "1.5px solid var(--sf-border, rgba(0,0,0,0.07))",
              background: "var(--sf-surface)",
              fontSize: "13.5px",
              color: "var(--sf-text)",
              outline: "none",
              width: "220px",
              fontFamily: "var(--sf-font)",
              transition: "border-color 120ms",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--sf-accent, #4F46E5)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--sf-border, rgba(0,0,0,0.07))";
            }}
          />
          <p
            style={{
              fontSize: "13px",
              color: "var(--sf-text2)",
              whiteSpace: "nowrap",
            }}
          >
            {isLoading ? t.loading : `${totalCount} items`}
          </p>
        </div>
      </div>

      {isError ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            fontSize: "14px",
            color: "#dc2626",
          }}
        >
          Failed to load products.
        </div>
      ) : isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "24px",
          }}
        >
          {[...Array(8)].map((_, i) => (
            <div key={i}>
              <div
                style={{
                  borderRadius: "16px",
                  aspectRatio: "1/1",
                  background:
                    "linear-gradient(90deg, var(--sf-surface,#fff) 25%, var(--sf-border,rgba(0,0,0,0.04)) 50%, var(--sf-surface,#fff) 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.4s infinite",
                }}
              />
              <div
                style={{
                  marginTop: "12px",
                  height: "13px",
                  width: "75%",
                  borderRadius: "8px",
                  background:
                    "linear-gradient(90deg, var(--sf-surface,#fff) 25%, var(--sf-border,rgba(0,0,0,0.04)) 50%, var(--sf-surface,#fff) 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.4s infinite",
                }}
              />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <Package
            size={48}
            style={{
              color: "var(--sf-border, rgba(0,0,0,0.1))",
              margin: "0 auto 14px",
              display: "block",
            }}
          />
          <p
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "var(--sf-text2)",
            }}
          >
            {dSearch ? t.noMatches : t.noProducts}
          </p>
          {dSearch && (
            <button
              onClick={() => {
                setSearch("");
                setDSearch("");
              }}
              style={{
                marginTop: "10px",
                fontSize: "14px",
                color: "var(--sf-accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              {t.clearSearch}
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "24px",
          }}
        >
          {products.map((p) => (
            <ProductCard key={p.id} product={p} storeSlug={storeSlug} />
          ))}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "6px",
            marginTop: "52px",
          }}
        >
          {[...Array(Math.min(totalPages, 10))].map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setPage(i + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: "1.5px solid",
                borderColor:
                  page === i + 1
                    ? "var(--sf-accent)"
                    : "var(--sf-border, rgba(0,0,0,0.07))",
                background:
                  page === i + 1 ? "var(--sf-accent)" : "var(--sf-surface)",
                color: page === i + 1 ? "#fff" : "var(--sf-text2)",
                fontWeight: "600",
                fontSize: "13.5px",
                cursor: "pointer",
                transition: "all 160ms",
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </section>
  );
}

// ═══════════════════════════════════════════════════════
//  PAGE ROOT
// ═══════════════════════════════════════════════════════

function HomeClient({ storeSlug }) {
  const config = useStore();
  const { t } = useLang();
  const [activeCat, setActiveCat] = useState("");
  const tc = config?.themeConfig ?? {};

  const { data: cats = [] } = useQuery({
    queryKey: ["sf-cats", storeSlug],
    queryFn: async () => {
      const res = await fetch(`/api/storefront/${storeSlug}/categories`);
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 600000,
  });

  const { data: featured } = useQuery({
    queryKey: ["sf-featured", storeSlug],
    queryFn: async () => {
      const res = await fetch(
        `/api/storefront/${storeSlug}/products?limit=8&sortBy=created_at`,
      );
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 300000,
  });

  const isHome = !activeCat;
  const showNewArrivals = tc.show_new_arrivals !== false;
  const showTrending = tc.show_trending !== false;

  return (
    <div>
      {isHome && <BentoHero config={config} storeSlug={storeSlug} />}

      <CategoryNav
        categories={cats}
        activeCat={activeCat}
        setActiveCat={setActiveCat}
      />

      {isHome && showNewArrivals && featured?.length > 0 && (
        <ProductStrip
          title={t.newArrivals}
          products={featured}
          storeSlug={storeSlug}
          href={`/${storeSlug}`}
        />
      )}

      {isHome && showTrending && featured?.length > 4 && (
        <ProductStrip
          title={t.trending}
          products={[...featured].reverse()}
          storeSlug={storeSlug}
          href={`/${storeSlug}`}
        />
      )}

      {isHome && (
        <div style={{ padding: "52px 0 0" }}>
          <TrustSignals />
        </div>
      )}

      <ProductCatalog storeSlug={storeSlug} activeCat={activeCat} />
    </div>
  );
}

export default function StorefrontHomePage({ params }) {
  return <HomeClient storeSlug={params.storeSlug} />;
}
