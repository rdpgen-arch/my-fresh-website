"use client";
/**
 * Storefront Layout — Spatial Design System v2
 *
 * Key systems:
 *  ① LangContext    — Bangla/English toggle, localStorage persistence
 *  ② ThemeContext   — 100% dynamic CSS vars from store config
 *  ③ postMessage    — Iframe-based live preview from admin panel
 *  ④ Floating pill  — Sticky nav that shrinks on scroll
 *  ⑤ Pixel inject   — FB/GTM/GA4/TT injected from theme_config
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  Search,
  X,
  Menu,
  Globe,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { useCartStore } from "@/utils/cartStore";

// ═══════════════════════════════════════════════════════
//  LANGUAGE CONTEXT
// ═══════════════════════════════════════════════════════

export const STRINGS = {
  en: {
    search: "Search products…",
    cart: "Cart",
    trackOrder: "Track Order",
    shop: "Shop",
    freeDelivery: "Free delivery over ৳500",
    cod: "Cash on Delivery",
    returns: "7-Day Returns",
    original: "100% Original",
    allProducts: "All Products",
    viewCart: "View Cart",
    addToCart: "Add",
    addedToCart: "Added!",
    outOfStock: "Out of Stock",
    lowStock: "Only {n} left",
    codAvailable: "COD Available",
    loading: "Loading…",
    newsletter: "Stay in the loop",
    newsletterSub: "New arrivals & exclusive offers straight to you.",
    emailPlaceholder: "Your email address",
    subscribe: "Subscribe",
    quickLinks: "Quick Links",
    contact: "Contact",
    payment: "We Accept",
    poweredBy: "Powered by PlatformHQ",
    storeNotFound: "Store not found",
    noProducts: "No products yet.",
    noMatches: "Nothing found.",
    clearSearch: "Clear search",
    seeAll: "See all →",
    flashSale: "Flash Sale",
    trending: "Trending",
    newArrivals: "New Arrivals",
    bestSellers: "Best Sellers",
    categories: "Categories",
    trustTitle: "Why shop with us?",
  },
  bn: {
    search: "পণ্য খুঁজুন…",
    cart: "কার্ট",
    trackOrder: "ট্র্যাক করুন",
    shop: "শপ",
    freeDelivery: "৳৫০০+ অর্ডারে ফ্রি ডেলিভারি",
    cod: "ক্যাশ অন ডেলিভারি",
    returns: "৭ দিনের রিটার্ন",
    original: "১০০% অরিজিনাল",
    allProducts: "সব পণ্য",
    viewCart: "কার্ট দেখুন",
    addToCart: "যোগ করুন",
    addedToCart: "যোগ হয়েছে!",
    outOfStock: "স্টক নেই",
    lowStock: "মাত্র {n}টি বাকি",
    codAvailable: "COD পাওয়া যাচ্ছে",
    loading: "লোড হচ্ছে…",
    newsletter: "আপডেট পান",
    newsletterSub: "নতুন পণ্য ও অফার সবার আগে জানুন।",
    emailPlaceholder: "আপনার ইমেইল",
    subscribe: "সাবস্ক্রাইব",
    quickLinks: "দ্রুত লিংক",
    contact: "যোগাযোগ",
    payment: "পেমেন্ট",
    poweredBy: "Powered by PlatformHQ",
    storeNotFound: "স্টোর পাওয়া যায়নি",
    noProducts: "এখনো কোনো পণ্য নেই।",
    noMatches: "কোনো পণ্য পাওয়া যায়নি।",
    clearSearch: "সার্চ মুছুন",
    seeAll: "সব দেখুন →",
    flashSale: "ফ্ল্যাশ সেল",
    trending: "ট্রেন্ডিং",
    newArrivals: "নতুন পণ্য",
    bestSellers: "বেস্টসেলার",
    categories: "ক্যাটাগরি",
    trustTitle: "কেন আমাদের কাছে কিনবেন?",
  },
};

const LangCtx = createContext({ lang: "en", t: STRINGS.en, setLang: () => {} });
export const useLang = () => useContext(LangCtx);

// ═══════════════════════════════════════════════════════
//  STORE CONTEXT  (same shape as before — compatible)
// ═══════════════════════════════════════════════════════

const StoreCtx = createContext(null);
export const useStore = () => useContext(StoreCtx);

// ═══════════════════════════════════════════════════════
//  DYNAMIC THEME SYSTEM
// ═══════════════════════════════════════════════════════

// Default fallback colors
const DEFAULTS = {
  bg: "#FAFAFA",
  surface: "#FFFFFF",
  text: "#111827",
  text2: "#6B7280",
  accent: "#4F46E5",
  border: "rgba(0,0,0,0.06)",
};

function hexAlpha(hex, a) {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  } catch {
    return `rgba(79,70,229,${a})`;
  }
}

export function applyTheme(tc = {}) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const bg = tc["--sf-bg"] || tc.bg || DEFAULTS.bg;
  const surface = tc["--sf-surface"] || tc.surface || DEFAULTS.surface;
  const text = tc["--sf-text"] || tc.text || DEFAULTS.text;
  const text2 = tc["--sf-text2"] || tc.text2 || DEFAULTS.text2;
  const accent =
    tc["--sf-accent"] || tc["--accent"] || tc.accent || DEFAULTS.accent;
  const border = tc["--sf-border"] || tc.border || DEFAULTS.border;

  const vars = {
    "--sf-bg": bg,
    "--sf-surface": surface,
    "--sf-text": text,
    "--sf-text2": text2,
    "--sf-accent": accent,
    "--sf-border": border,
    "--sf-accent-alpha": hexAlpha(accent, 0.12),
    "--sf-font": tc.font_body || "'Inter', system-ui, sans-serif",
    "--sf-font-heading":
      tc.font_heading || tc.font_body || "'Inter', system-ui, sans-serif",
    // legacy compat — keep other pages working
    "--c-bg": bg,
    "--c-surface": surface,
    "--c-text": text,
    "--c-text-muted": text2,
    "--c-accent": accent,
    "--c-primary": text,
    "--c-primary-fg": surface,
    "--c-border": border,
    "--accent": accent,
    "--accent-muted": hexAlpha(accent, 0.12),
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}

function injectPixels(tc = {}) {
  if (typeof document === "undefined") return;
  if (tc.fb_pixel_id && !document.getElementById("fb-pixel")) {
    const s = document.createElement("script");
    s.id = "fb-pixel";
    s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${tc.fb_pixel_id}');fbq('track','PageView');`;
    document.head.appendChild(s);
  }
  if (tc.gtm_id && !document.getElementById("gtm")) {
    const s = document.createElement("script");
    s.id = "gtm";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtm.js?id=${tc.gtm_id}`;
    document.head.appendChild(s);
  }
  if (tc.ga4_id && !document.getElementById("ga4")) {
    const s = document.createElement("script");
    s.id = "ga4";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${tc.ga4_id}`;
    document.head.appendChild(s);
    const i = document.createElement("script");
    i.id = "ga4-init";
    i.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${tc.ga4_id}');`;
    document.head.appendChild(i);
  }
  if (tc.tt_pixel_id && !document.getElementById("tt-pixel")) {
    const s = document.createElement("script");
    s.id = "tt-pixel";
    s.innerHTML = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tc.tt_pixel_id}');ttq.page();}(window,document,'ttq');`;
    document.head.appendChild(s);
  }
  if (tc.fb_domain_code && !document.getElementById("fb-domain")) {
    const m = document.createElement("meta");
    m.id = "fb-domain";
    m.name = "facebook-domain-verification";
    m.content = tc.fb_domain_code;
    document.head.appendChild(m);
  }
  if (tc.gsc_code && !document.getElementById("gsc")) {
    const m = document.createElement("meta");
    m.id = "gsc";
    m.name = "google-site-verification";
    m.content = tc.gsc_code;
    document.head.appendChild(m);
  }
}

// ═══════════════════════════════════════════════════════
//  FLOATING PILL HEADER
// ═══════════════════════════════════════════════════════

function FloatingHeader({ storeSlug, config }) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang, t } = useLang();
  const searchRef = useRef(null);
  const items = useCartStore((s) => s.items);
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const tc = config?.themeConfig ?? {};
  const logoUrl = tc.logo_url;
  const logoText = tc.logo_text || config?.name || "Store";

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 28);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (searchOpen && searchRef.current) searchRef.current.focus();
  }, [searchOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      window.location.href = `/${storeSlug}?search=${encodeURIComponent(searchVal.trim())}`;
    }
  };

  const pillH = scrolled ? "50px" : "60px";

  return (
    <>
      {/* Floating pill */}
      <div
        style={{
          position: "fixed",
          top: scrolled ? "10px" : "14px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          width: "min(94vw, 1120px)",
          transition: "top 300ms cubic-bezier(0.4,0,0.2,1)",
        }}
        className="sf-pill-wrap"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: pillH,
            padding: scrolled ? "0 18px" : "0 22px",
            background: scrolled
              ? "rgba(255,255,255,0.92)"
              : "var(--sf-surface, #FFFFFF)",
            backdropFilter: scrolled ? "blur(16px)" : "none",
            WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
            borderRadius: "999px",
            boxShadow: scrolled
              ? "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)"
              : "0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.06)",
            transition:
              "height 300ms cubic-bezier(0.4,0,0.2,1), padding 300ms cubic-bezier(0.4,0,0.2,1), box-shadow 300ms",
            gap: "14px",
          }}
        >
          {/* Logo */}
          <a
            href={`/${storeSlug}`}
            style={{
              textDecoration: "none",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={logoText}
                style={{
                  height: scrolled ? "26px" : "30px",
                  objectFit: "contain",
                  transition: "height 300ms",
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: scrolled ? "16px" : "18px",
                  fontWeight: "800",
                  color: "var(--sf-text, #111827)",
                  letterSpacing: "-0.03em",
                  fontFamily: "var(--sf-font-heading)",
                  transition: "font-size 300ms",
                }}
              >
                {logoText}
              </span>
            )}
          </a>

          {/* Desktop nav — centered */}
          <nav
            style={{
              flex: 1,
              display: "flex",
              justifyContent: "center",
              gap: "2px",
            }}
            className="sf-nav-desk"
          >
            {[
              { label: t.shop, href: `/${storeSlug}` },
              { label: t.trackOrder, href: `/${storeSlug}/track` },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  padding: "5px 14px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  color: "var(--sf-text2, #6B7280)",
                  fontWeight: "500",
                  textDecoration: "none",
                  transition: "all 140ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--sf-bg, #FAFAFA)";
                  e.currentTarget.style.color = "var(--sf-text, #111827)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--sf-text2, #6B7280)";
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right icons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              flexShrink: 0,
            }}
          >
            {/* Search */}
            {searchOpen ? (
              <form
                onSubmit={handleSearch}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <input
                  ref={searchRef}
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder={t.search}
                  style={{
                    width: "180px",
                    padding: "6px 14px",
                    borderRadius: "999px",
                    border: "1.5px solid var(--sf-accent, #4F46E5)",
                    background: "var(--sf-bg, #FAFAFA)",
                    fontSize: "13px",
                    color: "var(--sf-text, #111827)",
                    outline: "none",
                    fontFamily: "var(--sf-font)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchVal("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--sf-text2)",
                    padding: "4px",
                    display: "flex",
                  }}
                >
                  <X size={15} />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--sf-text2, #6B7280)",
                  transition: "all 120ms",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--sf-bg)";
                  e.currentTarget.style.color = "var(--sf-text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--sf-text2)";
                }}
              >
                <Search size={17} />
              </button>
            )}

            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === "en" ? "bn" : "en")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "3px",
                padding: "4px 10px",
                borderRadius: "999px",
                border: "1px solid rgba(0,0,0,0.08)",
                background: "none",
                cursor: "pointer",
                fontSize: "11.5px",
                fontWeight: "700",
                color: "var(--sf-text2)",
                transition: "all 120ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--sf-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Globe size={12} />
              {lang === "en" ? "বাং" : "EN"}
            </button>

            {/* Cart pill */}
            <a
              href={`/${storeSlug}/checkout`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "999px",
                background: "var(--sf-accent, #4F46E5)",
                color: "#fff",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: "700",
                transition: "transform 160ms, opacity 160ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.opacity = "1";
              }}
            >
              <ShoppingCart size={14} />
              <span className="sf-cart-lbl">{t.cart}</span>
              {cartCount > 0 && (
                <span
                  style={{
                    background: "#fff",
                    color: "var(--sf-accent, #4F46E5)",
                    borderRadius: "999px",
                    fontSize: "10px",
                    fontWeight: "800",
                    minWidth: "17px",
                    height: "17px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                  }}
                >
                  {cartCount}
                </span>
              )}
            </a>

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="sf-ham"
              style={{
                display: "none",
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "none",
                border: "none",
                cursor: "pointer",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--sf-text2)",
              }}
            >
              {mobileOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div
            style={{
              marginTop: "8px",
              background: "var(--sf-surface, #fff)",
              borderRadius: "20px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
              border: "1px solid rgba(0,0,0,0.06)",
              padding: "8px",
              overflow: "hidden",
            }}
          >
            {[
              { label: t.shop, href: `/${storeSlug}` },
              { label: t.trackOrder, href: `/${storeSlug}/track` },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "13px 16px",
                  color: "var(--sf-text)",
                  textDecoration: "none",
                  fontSize: "15px",
                  fontWeight: "500",
                  borderRadius: "12px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--sf-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {item.label}{" "}
                <ChevronRight size={15} style={{ color: "var(--sf-text2)" }} />
              </a>
            ))}
            {/* Search in mobile */}
            <form onSubmit={handleSearch} style={{ padding: "8px 10px 4px" }}>
              <input
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder={t.search}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  border: "1.5px solid rgba(0,0,0,0.08)",
                  background: "var(--sf-bg)",
                  fontSize: "14px",
                  color: "var(--sf-text)",
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "var(--sf-font)",
                }}
              />
            </form>
          </div>
        )}
      </div>

      {/* Header spacer */}
      <div style={{ height: "90px" }} />

      <style jsx global>{`
        @media (min-width: 640px) {
          .sf-ham { display: none !important; }
          .sf-nav-desk { display: flex !important; }
        }
        @media (max-width: 639px) {
          .sf-pill-wrap { width: calc(100vw - 20px) !important; }
          .sf-nav-desk { display: none !important; }
          .sf-ham { display: flex !important; }
          .sf-cart-lbl { display: none !important; }
        }
      `}</style>
    </>
  );
}

// ═══════════════════════════════════════════════════════
//  STICKY MOBILE CART
// ═══════════════════════════════════════════════════════

function StickyCart({ storeSlug, t }) {
  const items = useCartStore((s) => s.items);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  if (count === 0) return null;
  const cur = items[0]?.currency ?? "BDT";
  const sym = cur === "BDT" ? "৳" : "$";
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 47,
        padding: "0 16px 16px",
      }}
      className="sf-sticky-cart"
    >
      <a
        href={`/${storeSlug}/checkout`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "var(--sf-accent, #4F46E5)",
          color: "#fff",
          borderRadius: "16px",
          textDecoration: "none",
          boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              background: "rgba(255,255,255,0.22)",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: "800",
              padding: "2px 9px",
            }}
          >
            {count}
          </span>
          <span style={{ fontSize: "15px", fontWeight: "700" }}>
            {t.viewCart}
          </span>
        </div>
        <span style={{ fontSize: "16px", fontWeight: "800" }}>
          {sym}
          {total.toLocaleString("en-BD")}
        </span>
      </a>
      <style>{`@media (min-width: 768px) { .sf-sticky-cart { display: none !important; } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  WHATSAPP BUTTON
// ═══════════════════════════════════════════════════════

function WAButton({ phone }) {
  if (!phone) return null;
  const href = `https://wa.me/${String(phone).replace(/\D/g, "")}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "20px",
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        background: "#25d366",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 20px rgba(37,211,102,0.45)",
        zIndex: 48,
        textDecoration: "none",
        transition: "transform 150ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <MessageCircle size={26} color="#fff" fill="#fff" strokeWidth={0} />
    </a>
  );
}

// ═══════════════════════════════════════════════════════
//  FOOTER
// ═══════════════════════════════════════════════════════

function Footer({ storeSlug, config, t }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const tc = config?.themeConfig ?? {};
  const year = new Date().getFullYear();
  const name = config?.name ?? "Store";

  const socials = [
    { key: "facebook_url", label: "Facebook" },
    { key: "instagram_url", label: "Instagram" },
    { key: "tiktok_url", label: "TikTok" },
    { key: "youtube_url", label: "YouTube" },
  ].filter((s) => tc[s.key]);

  return (
    <footer
      style={{
        background: "var(--sf-text, #111827)",
        color: "rgba(255,255,255,0.6)",
      }}
    >
      {/* Newsletter */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "56px 20px",
        }}
      >
        <div
          style={{ maxWidth: "500px", margin: "0 auto", textAlign: "center" }}
        >
          <h3
            style={{
              fontSize: "clamp(22px,4vw,30px)",
              fontWeight: "800",
              color: "#fff",
              letterSpacing: "-0.025em",
              marginBottom: "8px",
              fontFamily: "var(--sf-font-heading)",
            }}
          >
            {t.newsletter}
          </h3>
          <p
            style={{
              fontSize: "14px",
              marginBottom: "24px",
              color: "rgba(255,255,255,0.45)",
            }}
          >
            {t.newsletterSub}
          </p>
          {done ? (
            <p
              style={{ fontSize: "15px", fontWeight: "600", color: "#4ade80" }}
            >
              ✓ Subscribed! We'll be in touch.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.includes("@")) setDone(true);
              }}
              style={{ display: "flex", gap: "8px" }}
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  borderRadius: "12px",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.07)",
                  color: "#fff",
                  fontSize: "14px",
                  outline: "none",
                  fontFamily: "var(--sf-font)",
                }}
              />
              <button
                type="submit"
                style={{
                  padding: "12px 22px",
                  borderRadius: "12px",
                  background: "var(--sf-accent, #4F46E5)",
                  color: "#fff",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {t.subscribe}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer grid */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "48px 20px 32px",
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gap: "40px",
        }}
        className="sf-footer-grid"
      >
        {/* Brand */}
        <div>
          <a
            href={`/${storeSlug}`}
            style={{
              textDecoration: "none",
              display: "block",
              marginBottom: "12px",
            }}
          >
            {tc.logo_url ? (
              <img
                src={tc.logo_url}
                alt={name}
                style={{
                  height: "26px",
                  objectFit: "contain",
                  filter: "brightness(0) invert(1)",
                  opacity: 0.8,
                }}
              />
            ) : (
              <span
                style={{
                  fontWeight: "800",
                  fontSize: "18px",
                  color: "#fff",
                  letterSpacing: "-0.025em",
                  fontFamily: "var(--sf-font-heading)",
                }}
              >
                {name}
              </span>
            )}
          </a>
          <p
            style={{
              fontSize: "13.5px",
              lineHeight: "1.7",
              maxWidth: "280px",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {config?.description ||
              "Premium products. Fast delivery. Genuine guaranteed."}
          </p>
          {socials.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "16px",
                flexWrap: "wrap",
              }}
            >
              {socials.map((s) => (
                <a
                  key={s.key}
                  href={tc[s.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "rgba(255,255,255,0.45)",
                    padding: "4px 10px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    textDecoration: "none",
                    transition: "all 120ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div>
          <p
            style={{
              fontSize: "10.5px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.28)",
              marginBottom: "14px",
            }}
          >
            {t.quickLinks}
          </p>
          {[
            { label: t.allProducts, href: `/${storeSlug}` },
            { label: t.trackOrder, href: `/${storeSlug}/track` },
            { label: t.cart, href: `/${storeSlug}/checkout` },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{
                display: "block",
                fontSize: "14px",
                color: "rgba(255,255,255,0.5)",
                textDecoration: "none",
                marginBottom: "10px",
                transition: "color 120ms",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.5)";
              }}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Contact + Payment */}
        <div>
          {(config?.contact_phone || config?.contact_email) && (
            <>
              <p
                style={{
                  fontSize: "10.5px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.28)",
                  marginBottom: "14px",
                }}
              >
                {t.contact}
              </p>
              {config?.contact_phone && (
                <a
                  href={`tel:${config.contact_phone}`}
                  style={{
                    display: "block",
                    fontSize: "13.5px",
                    color: "rgba(255,255,255,0.5)",
                    textDecoration: "none",
                    marginBottom: "8px",
                  }}
                >
                  📞 {config.contact_phone}
                </a>
              )}
              {config?.contact_email && (
                <a
                  href={`mailto:${config.contact_email}`}
                  style={{
                    display: "block",
                    fontSize: "13.5px",
                    color: "rgba(255,255,255,0.5)",
                    textDecoration: "none",
                    marginBottom: "18px",
                  }}
                >
                  ✉️ {config.contact_email}
                </a>
              )}
            </>
          )}
          <p
            style={{
              fontSize: "10.5px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.28)",
              marginBottom: "10px",
            }}
          >
            {t.payment}
          </p>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { label: "bKash", color: "#E2136E" },
              { label: "Nagad", color: "#FF6600" },
              { label: "COD", color: "#16A34A" },
            ].map((p) => (
              <span
                key={p.label}
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 9px",
                  borderRadius: "6px",
                  border: `1px solid ${p.color}40`,
                  color: p.color,
                  background: `${p.color}15`,
                }}
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "16px 20px",
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.22)" }}>
          © {year} {name}. All rights reserved.
        </p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.22)" }}>
          {t.poweredBy}
        </p>
      </div>

      <style>{`@media(max-width:639px){.sf-footer-grid{grid-template-columns:1fr!important}}`}</style>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════
//  ROOT CLIENT WRAPPER
// ═══════════════════════════════════════════════════════

function StorefrontClient({ storeSlug, children }) {
  const hydrate = useCartStore((s) => s.hydrate);
  const [lang, setLangState] = useState("en");
  const [t, setT] = useState(STRINGS.en);

  useEffect(() => {
    hydrate();
    const stored = localStorage.getItem("sf_lang") || "en";
    setLangState(stored);
    setT(STRINGS[stored] || STRINGS.en);
  }, [hydrate]);

  const setLang = useCallback((l) => {
    const next = l === "bn" ? "bn" : "en";
    setLangState(next);
    setT(STRINGS[next]);
    localStorage.setItem("sf_lang", next);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["store-config", storeSlug],
    queryFn: async () => {
      const res = await fetch(`/api/storefront/${storeSlug}/config`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Store not found");
      return json.data;
    },
    staleTime: 600000,
  });

  useEffect(() => {
    if (data?.themeConfig) {
      applyTheme(data.themeConfig);
      injectPixels(data.themeConfig);
    }
  }, [data]);

  // ✦ postMessage listener for iframe live preview
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "THEME_PREVIEW" && e.data.colors)
        applyTheme(e.data.colors);
      if (e.data?.type === "THEME_RESET" && data?.themeConfig)
        applyTheme(data.themeConfig);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [data]);

  // Default lang from store config
  useEffect(() => {
    if (data?.themeConfig?.default_lang && !localStorage.getItem("sf_lang")) {
      setLang(data.themeConfig.default_lang);
    }
  }, [data, setLang]);

  if (isLoading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAFA",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            border: "3px solid #e5e7eb",
            borderTopColor: "#4F46E5",
            animation: "sf-spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes sf-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  if (isError)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAFA",
          gap: "10px",
        }}
      >
        <p style={{ fontSize: "20px", fontWeight: "800", color: "#111827" }}>
          Store not found
        </p>
        <p style={{ fontSize: "14px", color: "#6B7280" }}>
          "{storeSlug}" is unavailable.
        </p>
      </div>
    );

  const waPhone = data?.themeConfig?.whatsapp_number || data?.contact_phone;

  return (
    <LangCtx.Provider value={{ lang, t, setLang }}>
      <StoreCtx.Provider value={{ ...data, storeSlug }}>
        <div
          style={{
            fontFamily: "var(--sf-font, 'Inter', system-ui, sans-serif)",
            background: "var(--sf-bg, #FAFAFA)",
            color: "var(--sf-text, #111827)",
            minHeight: "100vh",
            WebkitFontSmoothing: "antialiased",
          }}
        >
          <FloatingHeader storeSlug={storeSlug} config={data} />
          <main>{children}</main>
          <Footer storeSlug={storeSlug} config={data} t={t} />
          <WAButton phone={waPhone} />
          <StickyCart storeSlug={storeSlug} t={t} />
        </div>
      </StoreCtx.Provider>
    </LangCtx.Provider>
  );
}

export default function StorefrontLayout({ children }) {
  const storeSlug =
    typeof window !== "undefined"
      ? window.location.pathname.split("/").filter(Boolean)[0]
      : "";
  return <StorefrontClient storeSlug={storeSlug}>{children}</StorefrontClient>;
}
