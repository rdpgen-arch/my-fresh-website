"use client";
/**
 * Admin — Storefront Design
 *
 * Features:
 *  ① 7 curated professional themes (2026 e-commerce trends)
 *  ② Live iframe preview with postMessage color injection
 *  ③ Fine-tune any of the 4 core colors with color pickers
 *  ④ Font pairing selection (curated list)
 *  ⑤ Bento/hero image uploads
 *  ⑥ Default language toggle
 *  ⑦ Section visibility toggles
 *  All saved per-store in theme_config via PATCH /api/admin/store
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import { useUpload } from "@/utils/useUpload";
import {
  Palette,
  Check,
  Eye,
  Save,
  RefreshCw,
  Image,
  Type,
  Globe,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Loader2,
  Upload,
  ExternalLink,
} from "lucide-react";

// ─── Style tokens ────────────────────────────────────────────────────────────

const S = {
  radius: "12px",
  radiusSm: "8px",
  border: "#e5e7eb",
  borderSub: "#f3f4f6",
  text: "#111827",
  muted: "#6b7280",
  faint: "#9ca3af",
  surface: "#f9fafb",
  bg: "#fff",
  shadow: "0 1px 3px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.07)",
};

// ─── 7 Professional Themes ────────────────────────────────────────────────────

const THEMES = [
  {
    id: "cloud-minimal",
    name: "Cloud Minimal",
    desc: "Pantone 2026-inspired — clean, breathable, modern",
    colors: {
      "--sf-bg": "#FAFAFA",
      "--sf-surface": "#FFFFFF",
      "--sf-text": "#111827",
      "--sf-text2": "#6B7280",
      "--sf-accent": "#4F46E5",
      "--sf-border": "rgba(0,0,0,0.06)",
    },
    preview: ["#FAFAFA", "#4F46E5", "#111827"],
  },
  {
    id: "terracotta-earth",
    name: "Terracotta Earth",
    desc: "Warm, trustworthy, sustainable brand feel",
    colors: {
      "--sf-bg": "#FAF7F0",
      "--sf-surface": "#FFFFFF",
      "--sf-text": "#2B2118",
      "--sf-text2": "#8B7355",
      "--sf-accent": "#C9694A",
      "--sf-border": "rgba(0,0,0,0.07)",
    },
    preview: ["#FAF7F0", "#C9694A", "#2B2118"],
  },
  {
    id: "deep-navy",
    name: "Deep Navy Luxury",
    desc: "Dark, premium, high-end product feel",
    colors: {
      "--sf-bg": "#0F172A",
      "--sf-surface": "#1E293B",
      "--sf-text": "#F1F5F9",
      "--sf-text2": "#94A3B8",
      "--sf-accent": "#38BDF8",
      "--sf-border": "rgba(255,255,255,0.08)",
    },
    preview: ["#0F172A", "#38BDF8", "#F1F5F9"],
  },
  {
    id: "sage-wellness",
    name: "Sage Wellness",
    desc: "Calm, organic, lifestyle brand aesthetic",
    colors: {
      "--sf-bg": "#F4F7F2",
      "--sf-surface": "#FFFFFF",
      "--sf-text": "#1F2A1C",
      "--sf-text2": "#5A7055",
      "--sf-accent": "#6B9E78",
      "--sf-border": "rgba(0,0,0,0.06)",
    },
    preview: ["#F4F7F2", "#6B9E78", "#1F2A1C"],
  },
  {
    id: "coral-energy",
    name: "Coral Energy",
    desc: "Bold, energetic — fashion & youth brands",
    colors: {
      "--sf-bg": "#FFFFFF",
      "--sf-surface": "#FFF5F3",
      "--sf-text": "#1A1A1A",
      "--sf-text2": "#6B6B6B",
      "--sf-accent": "#E76F51",
      "--sf-border": "rgba(0,0,0,0.06)",
    },
    preview: ["#FFFFFF", "#E76F51", "#1A1A1A"],
  },
  {
    id: "classic-trust",
    name: "Classic Trust",
    desc: "Blue-based — reliable, broad-appeal, safe bet",
    colors: {
      "--sf-bg": "#F8F9FA",
      "--sf-surface": "#FFFFFF",
      "--sf-text": "#212529",
      "--sf-text2": "#6C757D",
      "--sf-accent": "#0582CA",
      "--sf-border": "rgba(0,0,0,0.06)",
    },
    preview: ["#F8F9FA", "#0582CA", "#212529"],
  },
  {
    id: "mocha-premium",
    name: "Mocha Premium",
    desc: "Warm neutral with deep accent — mature & refined",
    colors: {
      "--sf-bg": "#F5F0EB",
      "--sf-surface": "#FFFFFF",
      "--sf-text": "#2E2A26",
      "--sf-text2": "#7A6E65",
      "--sf-accent": "#8B5E3C",
      "--sf-border": "rgba(0,0,0,0.06)",
    },
    preview: ["#F5F0EB", "#8B5E3C", "#2E2A26"],
  },
];

const FONT_PAIRS = [
  {
    id: "inter",
    label: "Inter (Default)",
    body: "'Inter', system-ui, sans-serif",
    heading: "'Inter', system-ui, sans-serif",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    body: "'DM Sans', sans-serif",
    heading: "'DM Sans', sans-serif",
  },
  {
    id: "plus-jakarta",
    label: "Plus Jakarta Sans",
    body: "'Plus Jakarta Sans', sans-serif",
    heading: "'Plus Jakarta Sans', sans-serif",
  },
  {
    id: "nunito",
    label: "Nunito",
    body: "'Nunito', sans-serif",
    heading: "'Nunito', sans-serif",
  },
  {
    id: "outfit",
    label: "Outfit",
    body: "'Outfit', sans-serif",
    heading: "'Outfit', sans-serif",
  },
  {
    id: "poppins",
    label: "Poppins",
    body: "'Poppins', sans-serif",
    heading: "'Poppins', sans-serif",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Swatch({ color, size = 18 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        border: "1.5px solid rgba(0,0,0,0.1)",
        flexShrink: 0,
      }}
    />
  );
}

function SectionCard({ icon: Icon, title, color = "#4F46E5", children }) {
  return (
    <div
      style={{
        background: S.bg,
        border: `1px solid ${S.border}`,
        borderRadius: S.radius,
        overflow: "hidden",
        marginBottom: "16px",
        boxShadow: S.shadow,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "14px 18px",
          background: S.surface,
          borderBottom: `1px solid ${S.border}`,
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "7px",
            background: `${color}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={15} style={{ color }} />
        </div>
        <span style={{ fontSize: "14px", fontWeight: "700", color: S.text }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "18px" }}>{children}</div>
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <label style={{ fontSize: "12px", fontWeight: "600", color: S.muted }}>
        {label}
      </label>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="color"
          value={value || "#4F46E5"}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "44px",
            height: "36px",
            padding: "2px",
            border: `1.5px solid ${S.border}`,
            borderRadius: S.radiusSm,
            cursor: "pointer",
            background: S.bg,
          }}
        />
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#4F46E5"
          style={{
            flex: 1,
            padding: "8px 10px",
            border: `1.5px solid ${S.border}`,
            borderRadius: S.radiusSm,
            fontSize: "13px",
            fontFamily: "ui-monospace,monospace",
            color: S.text,
            outline: "none",
            background: S.bg,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--accent, #4F46E5)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = S.border;
          }}
        />
        <Swatch color={value || "#4F46E5"} size={20} />
      </div>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: "38px",
        height: "22px",
        borderRadius: "999px",
        border: "none",
        background: on ? "var(--accent, #4F46E5)" : "#d1d5db",
        padding: "3px",
        cursor: "pointer",
        transition: "background 150ms",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "#fff",
          transform: on ? "translateX(16px)" : "translateX(0)",
          transition: "transform 150ms",
          display: "block",
        }}
      />
    </button>
  );
}

// ─── Live Preview Panel ───────────────────────────────────────────────────────

function LivePreview({ storeSlug, pendingColors }) {
  const iframeRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  // Send colors to iframe via postMessage whenever they change
  useEffect(() => {
    if (!loaded || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "THEME_PREVIEW", colors: pendingColors },
      "*",
    );
  }, [pendingColors, loaded]);

  if (!storeSlug) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: "12px",
        }}
      >
        <Eye size={32} style={{ color: S.faint }} />
        <p style={{ fontSize: "13px", color: S.muted, textAlign: "center" }}>
          Preview loads after store is configured.
        </p>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Preview header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          background: "#1e293b",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
            <div
              key={c}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: c,
              }}
            />
          ))}
        </div>
        <p
          style={{
            fontSize: "11px",
            color: "rgba(255,255,255,0.4)",
            fontFamily: "monospace",
          }}
        >
          /{storeSlug}
        </p>
        <a
          href={`/${storeSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "rgba(255,255,255,0.5)",
            display: "flex",
            padding: "2px",
          }}
        >
          <ExternalLink size={12} />
        </a>
      </div>
      {/* iframe */}
      <div style={{ flex: 1, position: "relative" }}>
        {!loaded && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f9fafb",
            }}
          >
            <Loader2
              size={20}
              style={{
                color: "#9ca3af",
                animation: "spin 0.8s linear infinite",
              }}
            />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={`/${storeSlug}`}
          onLoad={() => {
            setLoaded(true);
            // Send colors immediately after load
            setTimeout(() => {
              if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage(
                  { type: "THEME_PREVIEW", colors: pendingColors },
                  "*",
                );
              }
            }, 300);
          }}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
          title="Storefront Preview"
        />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StorefrontDesignPage() {
  const [tc, setTc] = useState({});
  const [activeTheme, setActiveTheme] = useState(null);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const qc = useQueryClient();
  const { upload, uploading } = useUpload();

  // Load store data
  const { data: storeData, isLoading } = useQuery({
    queryKey: ["admin-store"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/store");
      if (!res.ok) throw new Error("Failed to load store");
      const json = await res.json();
      return json.data ?? json;
    },
    staleTime: 60000,
  });

  useEffect(() => {
    if (storeData?.theme_config) {
      setTc(storeData.theme_config);
      // Detect active theme
      const matched = THEMES.find(
        (t) => t.id === storeData.theme_config.active_theme_id,
      );
      if (matched) setActiveTheme(matched.id);
    }
  }, [storeData]);

  const storeSlug = storeData?.slug ?? "";

  // Build pending colors for live preview
  const pendingColors = {
    "--sf-bg": tc["--sf-bg"] || "#FAFAFA",
    "--sf-surface": tc["--sf-surface"] || "#FFFFFF",
    "--sf-text": tc["--sf-text"] || "#111827",
    "--sf-text2": tc["--sf-text2"] || "#6B7280",
    "--sf-accent": tc["--sf-accent"] || "#4F46E5",
    "--sf-border": tc["--sf-border"] || "rgba(0,0,0,0.06)",
    font_body: tc.font_body || "",
    font_heading: tc.font_heading || "",
  };

  const setColor = (key) => (val) => {
    setTc((p) => ({ ...p, [key]: val }));
  };

  const applyTheme = (theme) => {
    setActiveTheme(theme.id);
    setTc((p) => ({ ...p, ...theme.colors, active_theme_id: theme.id }));
  };

  // Save mutation
  const saveMut = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/admin/store", {
        method: "PATCH",
        body: JSON.stringify({ theme_config: tc }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Save failed");
      }
    },
    onSuccess: () => {
      setSuccess(true);
      setErr("");
      setTimeout(() => setSuccess(false), 3500);
      qc.invalidateQueries({ queryKey: ["admin-store"] });
      qc.invalidateQueries({ queryKey: ["admin-store-meta"] });
    },
    onError: (e) => setErr(e.message),
  });

  // Image upload helper
  const handleImgUpload = useCallback(
    (tcKey) => async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const url = await upload({ url: reader.result });
        if (url) setTc((p) => ({ ...p, [tcKey]: url }));
      };
      reader.readAsDataURL(file);
    },
    [upload],
  );

  if (isLoading) {
    return (
      <div
        style={{ padding: "60px", display: "flex", justifyContent: "center" }}
      >
        <Loader2
          size={24}
          style={{ animation: "spin 0.8s linear infinite", color: S.faint }}
        />
      </div>
    );
  }

  const colorFields = [
    { key: "--sf-bg", label: "Background" },
    { key: "--sf-surface", label: "Surface / Cards" },
    { key: "--sf-text", label: "Primary Text" },
    { key: "--sf-text2", label: "Secondary Text" },
    { key: "--sf-accent", label: "Accent / CTA Color" },
  ];

  const sectionToggles = [
    { key: "show_new_arrivals", label: "New Arrivals section" },
    { key: "show_trending", label: "Trending section" },
    { key: "show_flash_sale", label: "Flash Sale section" },
    { key: "show_reviews", label: "Customer Reviews section" },
  ];

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        overflow: "hidden",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Left panel: controls ── */}
      <div
        style={{
          width: previewMode ? "380px" : "520px",
          flexShrink: 0,
          overflowY: "auto",
          borderRight: `1px solid ${S.border}`,
          background: S.surface,
          transition: "width 280ms",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 20px",
            background: S.bg,
            borderBottom: `1px solid ${S.border}`,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "17px",
                fontWeight: "800",
                color: S.text,
                letterSpacing: "-0.02em",
              }}
            >
              Storefront Design
            </h1>
            <p style={{ fontSize: "12px", color: S.muted, marginTop: "1px" }}>
              Customize your store's look & feel
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setPreviewMode((p) => !p)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "8px 12px",
                border: `1.5px solid ${S.border}`,
                borderRadius: S.radiusSm,
                background: previewMode ? "#EEF2FF" : S.bg,
                color: previewMode ? "#4F46E5" : S.muted,
                fontSize: "12.5px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <Eye size={13} /> Preview
            </button>
            <button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                border: "none",
                borderRadius: S.radiusSm,
                background: "var(--accent, #4F46E5)",
                color: "#fff",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: saveMut.isPending ? "not-allowed" : "pointer",
                opacity: saveMut.isPending ? 0.7 : 1,
              }}
            >
              {saveMut.isPending ? (
                <Loader2
                  size={12}
                  style={{ animation: "spin 0.8s linear infinite" }}
                />
              ) : (
                <Save size={12} />
              )}
              Save & Publish
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 16px 60px" }}>
          {/* Status messages */}
          {success && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: S.radiusSm,
                color: "#16a34a",
                fontSize: "13px",
                fontWeight: "600",
                marginBottom: "14px",
              }}
            >
              <Check size={14} /> Theme saved and published!
            </div>
          )}
          {err && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: S.radiusSm,
                color: "#dc2626",
                fontSize: "13px",
                marginBottom: "14px",
              }}
            >
              <AlertCircle size={14} /> {err}
            </div>
          )}

          {/* ①  THEME PRESETS */}
          <SectionCard icon={Palette} title="Theme Presets" color="#4F46E5">
            <p
              style={{
                fontSize: "12.5px",
                color: S.muted,
                marginBottom: "14px",
              }}
            >
              One-click apply. Fine-tune colors below after selecting a theme.
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {THEMES.map((theme) => {
                const isActive = activeTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => applyTheme(theme)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: S.radiusSm,
                      border: `1.5px solid ${isActive ? "var(--accent, #4F46E5)" : S.border}`,
                      background: isActive ? "#EEF2FF" : S.bg,
                      cursor: "pointer",
                      transition: "all 120ms",
                      textAlign: "left",
                    }}
                  >
                    {/* Color swatches */}
                    <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                      {theme.preview.map((c, i) => (
                        <Swatch key={i} color={c} size={16} />
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          color: S.text,
                        }}
                      >
                        {theme.name}
                      </p>
                      <p style={{ fontSize: "11.5px", color: S.muted }}>
                        {theme.desc}
                      </p>
                    </div>
                    {isActive && (
                      <Check
                        size={15}
                        style={{
                          color: "var(--accent, #4F46E5)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* ② COLOR FINE-TUNING */}
          <SectionCard icon={Palette} title="Fine-Tune Colors" color="#7C3AED">
            <p
              style={{
                fontSize: "12.5px",
                color: S.muted,
                marginBottom: "14px",
              }}
            >
              Override any color from the selected theme. Changes apply
              instantly in preview.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
              }}
            >
              {colorFields.map((f) => (
                <ColorField
                  key={f.key}
                  label={f.label}
                  value={tc[f.key] || ""}
                  onChange={setColor(f.key)}
                />
              ))}
            </div>
          </SectionCard>

          {/* ③ FONT PAIRING */}
          <SectionCard icon={Type} title="Font Pairing" color="#0582CA">
            <p
              style={{
                fontSize: "12.5px",
                color: S.muted,
                marginBottom: "14px",
              }}
            >
              Curated pairings for consistent design quality.
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "7px" }}
            >
              {FONT_PAIRS.map((fp) => {
                const isActive = tc.font_body === fp.body;
                return (
                  <button
                    key={fp.id}
                    onClick={() =>
                      setTc((p) => ({
                        ...p,
                        font_body: fp.body,
                        font_heading: fp.heading,
                      }))
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 14px",
                      borderRadius: S.radiusSm,
                      border: `1.5px solid ${isActive ? "var(--accent, #4F46E5)" : S.border}`,
                      background: isActive ? "#EEF2FF" : S.bg,
                      cursor: "pointer",
                      transition: "all 120ms",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontFamily: fp.body,
                        fontWeight: "600",
                        color: S.text,
                      }}
                    >
                      {fp.label}
                    </span>
                    {isActive && (
                      <Check
                        size={13}
                        style={{ color: "var(--accent, #4F46E5)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* ④ HERO & BENTO IMAGES */}
          <SectionCard
            icon={Image}
            title="Hero & Banner Images"
            color="#D97706"
          >
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {[
                {
                  key: "hero_image_url",
                  label: "Main Hero Image (large left block)",
                  hint: "Recommended: 1400×900px",
                },
                {
                  key: "bento_img_1",
                  label: "Bento Promo Block 1 (top right)",
                  hint: "Recommended: 800×500px",
                },
                {
                  key: "bento_img_2",
                  label: "Bento Promo Block 2 (bottom right)",
                  hint: "Recommended: 800×500px",
                },
                {
                  key: "logo_url",
                  label: "Store Logo",
                  hint: "PNG with transparent background recommended",
                },
              ].map((field) => (
                <div key={field.key}>
                  <label
                    style={{
                      fontSize: "12.5px",
                      fontWeight: "600",
                      color: S.muted,
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    {field.label}
                  </label>
                  <p
                    style={{
                      fontSize: "11px",
                      color: S.faint,
                      marginBottom: "6px",
                    }}
                  >
                    {field.hint}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    {tc[field.key] && (
                      <img
                        src={tc[field.key]}
                        alt="Preview"
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "8px",
                          objectFit: "cover",
                          border: `1px solid ${S.border}`,
                        }}
                      />
                    )}
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 14px",
                        border: `1.5px solid ${S.border}`,
                        borderRadius: S.radiusSm,
                        background: S.bg,
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "500",
                        color: S.muted,
                      }}
                    >
                      <Upload size={13} /> {uploading ? "Uploading…" : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImgUpload(field.key)}
                        style={{ display: "none" }}
                      />
                    </label>
                    {tc[field.key] && (
                      <button
                        onClick={() =>
                          setTc((p) => ({ ...p, [field.key]: "" }))
                        }
                        style={{
                          padding: "8px 10px",
                          border: `1px solid #fecaca`,
                          borderRadius: S.radiusSm,
                          background: "#fef2f2",
                          color: "#dc2626",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {/* URL input fallback */}
                  <input
                    type="text"
                    value={tc[field.key] || ""}
                    onChange={(e) =>
                      setTc((p) => ({ ...p, [field.key]: e.target.value }))
                    }
                    placeholder="or paste image URL…"
                    style={{
                      width: "100%",
                      marginTop: "6px",
                      padding: "7px 10px",
                      border: `1.5px solid ${S.border}`,
                      borderRadius: S.radiusSm,
                      fontSize: "12.5px",
                      color: S.text,
                      outline: "none",
                      background: S.bg,
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--accent, #4F46E5)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = S.border;
                    }}
                  />
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ⑤ BENTO TEXT */}
          <SectionCard icon={Type} title="Hero & Bento Text" color="#16A34A">
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {[
                {
                  key: "hero_heading",
                  label: "Main Headline",
                  placeholder: "আজকের সেরা অফার",
                },
                {
                  key: "hero_subheading",
                  label: "Subheadline",
                  placeholder: "অরিজিনাল পণ্য · ক্যাশ অন ডেলিভারি",
                },
                {
                  key: "bento_text_1",
                  label: "Promo Block 1 Text",
                  placeholder: "নতুন আগমন",
                },
                {
                  key: "bento_text_2",
                  label: "Promo Block 2 Text",
                  placeholder: "ট্রেন্ডিং",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label
                    style={{
                      fontSize: "12.5px",
                      fontWeight: "600",
                      color: S.muted,
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    {f.label}
                  </label>
                  <input
                    type="text"
                    value={tc[f.key] || ""}
                    onChange={(e) =>
                      setTc((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                    placeholder={f.placeholder}
                    style={{
                      width: "100%",
                      padding: "9px 11px",
                      border: `1.5px solid ${S.border}`,
                      borderRadius: S.radiusSm,
                      fontSize: "13.5px",
                      color: S.text,
                      outline: "none",
                      background: S.bg,
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--accent, #4F46E5)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = S.border;
                    }}
                  />
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ⑥ DEFAULT LANGUAGE */}
          <SectionCard icon={Globe} title="Default Language" color="#0582CA">
            <p
              style={{
                fontSize: "12.5px",
                color: S.muted,
                marginBottom: "14px",
              }}
            >
              Shoppers can still toggle language. This sets the default for
              first-time visitors.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { id: "en", label: "🇬🇧 English" },
                { id: "bn", label: "🇧🇩 বাংলা" },
              ].map((lng) => {
                const active = (tc.default_lang || "en") === lng.id;
                return (
                  <button
                    key={lng.id}
                    onClick={() =>
                      setTc((p) => ({ ...p, default_lang: lng.id }))
                    }
                    style={{
                      flex: 1,
                      padding: "11px 16px",
                      borderRadius: S.radiusSm,
                      border: `1.5px solid ${active ? "var(--accent, #4F46E5)" : S.border}`,
                      background: active ? "#EEF2FF" : S.bg,
                      color: active ? "var(--accent, #4F46E5)" : S.muted,
                      fontSize: "14px",
                      fontWeight: active ? "700" : "500",
                      cursor: "pointer",
                      transition: "all 120ms",
                    }}
                  >
                    {lng.label}{" "}
                    {active && (
                      <Check
                        size={13}
                        style={{ display: "inline", marginLeft: "4px" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* ⑦ SECTION VISIBILITY */}
          <SectionCard
            icon={ToggleRight}
            title="Section Visibility"
            color="#7C3AED"
          >
            <p
              style={{
                fontSize: "12.5px",
                color: S.muted,
                marginBottom: "14px",
              }}
            >
              Show or hide homepage sections. Changes take effect immediately
              after saving.
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {sectionToggles.map((tog) => {
                const on = tc[tog.key] !== false;
                return (
                  <div
                    key={tog.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13.5px",
                        color: S.text,
                        fontWeight: "500",
                      }}
                    >
                      {tog.label}
                    </span>
                    <Toggle
                      on={on}
                      onChange={(val) =>
                        setTc((p) => ({ ...p, [tog.key]: val }))
                      }
                    />
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* Save bottom */}
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: S.radiusSm,
              border: "none",
              background: "var(--accent, #4F46E5)",
              color: "#fff",
              fontSize: "15px",
              fontWeight: "700",
              cursor: saveMut.isPending ? "not-allowed" : "pointer",
              opacity: saveMut.isPending ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {saveMut.isPending ? (
              <Loader2
                size={16}
                style={{ animation: "spin 0.8s linear infinite" }}
              />
            ) : (
              <Save size={16} />
            )}
            Save & Publish All Changes
          </button>
        </div>
      </div>

      {/* ── Right panel: live preview ── */}
      <div style={{ flex: 1, overflow: "hidden", background: "#1e293b" }}>
        <LivePreview storeSlug={storeSlug} pendingColors={pendingColors} />
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
