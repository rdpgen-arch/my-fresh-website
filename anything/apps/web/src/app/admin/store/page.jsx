"use client";
/**
 * Store Settings — Redesigned
 * Basic info · Logo · Contact · Social links · Theme · Hero copy
 */
import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  Store,
  Phone,
  Globe,
  Palette,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Image,
  Instagram,
  Facebook,
  Youtube,
  Link,
  MessageCircle,
} from "lucide-react";
import useUpload from "@/utils/useUpload";
import { authFetch } from "@/utils/authFetch";

// ─── Style tokens ─────────────────────────────────────────────────────────────
const S = {
  border: "#e5e7eb",
  borderSub: "#f3f4f6",
  text: "#111827",
  muted: "#6b7280",
  surface: "#f9fafb",
  radius: "12px",
  radiusSm: "8px",
  shadow: "0 1px 3px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.07)",
};

const iStyle = {
  width: "100%",
  padding: "9px 12px",
  border: `1.5px solid ${S.border}`,
  borderRadius: S.radiusSm,
  fontSize: "13.5px",
  color: S.text,
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
  e.target.style.borderColor = S.border;
};

function FormSection({ icon: Icon, title, color = "#6b7280", children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1.5px solid ${S.border}`,
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
          gap: "8px",
          padding: "13px 18px",
          background: S.surface,
          borderBottom: `1px solid ${S.border}`,
        }}
      >
        {Icon && <Icon size={14} style={{ color }} />}
        <span style={{ fontSize: "12.5px", fontWeight: "700", color: S.text }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "18px" }}>{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label
        style={{
          fontSize: "12.5px",
          fontWeight: "600",
          color: S.muted,
          display: "block",
          marginBottom: "5px",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const THEME_PRESETS = [
  {
    label: "Purple (Default)",
    vars: {
      "--accent": "#5B21B6",
      "--accent-hover": "#4C1D95",
      "--accent-fg": "#ffffff",
      "--accent-muted": "#EDE9FE",
    },
  },
  {
    label: "Blue",
    vars: {
      "--accent": "#2563EB",
      "--accent-hover": "#1D4ED8",
      "--accent-fg": "#ffffff",
      "--accent-muted": "#DBEAFE",
    },
  },
  {
    label: "Green",
    vars: {
      "--accent": "#059669",
      "--accent-hover": "#047857",
      "--accent-fg": "#ffffff",
      "--accent-muted": "#D1FAE5",
    },
  },
  {
    label: "Rose",
    vars: {
      "--accent": "#E11D48",
      "--accent-hover": "#BE123C",
      "--accent-fg": "#ffffff",
      "--accent-muted": "#FFE4E6",
    },
  },
  {
    label: "Orange",
    vars: {
      "--accent": "#EA580C",
      "--accent-hover": "#C2410C",
      "--accent-fg": "#ffffff",
      "--accent-muted": "#FED7AA",
    },
  },
  {
    label: "Teal",
    vars: {
      "--accent": "#0891B2",
      "--accent-hover": "#0E7490",
      "--accent-fg": "#ffffff",
      "--accent-muted": "#CFFAFE",
    },
  },
];

export default function StoreSettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    description: "",
    logo_url: "",
    contact_email: "",
    contact_phone: "",
    currency: "BDT",
  });
  const [themeConfig, setThemeConfig] = useState({});
  const [success, setSuccess] = useState(false);
  const [upload, { loading: uploading }] = useUpload();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-store"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/store");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.data;
    },
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.name ?? "",
      description: data.description ?? "",
      logo_url: data.logo_url ?? "",
      contact_email: data.contact_email ?? "",
      contact_phone: data.contact_phone ?? "",
      currency: data.currency ?? "BDT",
    });
    setThemeConfig(data.theme_config ?? {});
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/admin/store", {
        method: "PATCH",
        body: JSON.stringify({ ...form, theme_config: themeConfig }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed.");
      return json.data;
    },
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      qc.invalidateQueries({ queryKey: ["admin-store"] });
      qc.invalidateQueries({ queryKey: ["admin-store-meta"] });
    },
  });

  const handleLogoUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const { url } = await upload({ url: reader.result });
        if (url) setForm((f) => ({ ...f, logo_url: url }));
      };
      reader.readAsDataURL(file);
    },
    [upload],
  );

  const handleHeroImgUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const { url } = await upload({ url: reader.result });
        if (url) setThemeConfig((t) => ({ ...t, hero_image_url: url }));
      };
      reader.readAsDataURL(file);
    },
    [upload],
  );

  const setTC = (k) => (e) =>
    setThemeConfig((t) => ({ ...t, [k]: e.target.value }));
  const setTCVal = (k, v) => setThemeConfig((t) => ({ ...t, [k]: v }));
  const ch = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  if (isLoading)
    return (
      <div style={{ padding: "40px 28px", color: S.muted, fontSize: "14px" }}>
        Loading store settings…
      </div>
    );

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "0 auto",
        padding: "28px 20px 60px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: S.text,
              letterSpacing: "-0.025em",
              marginBottom: "3px",
            }}
          >
            Store Settings
          </h1>
          <p style={{ fontSize: "13px", color: S.muted }}>
            Configure your store identity, theme, and social presence.
          </p>
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "10px 20px",
            background: "var(--accent, #5B21B6)",
            color: "#fff",
            border: "none",
            borderRadius: S.radiusSm,
            fontSize: "13.5px",
            fontWeight: "700",
            cursor: mutation.isPending ? "not-allowed" : "pointer",
            opacity: mutation.isPending ? 0.7 : 1,
          }}
        >
          {mutation.isPending ? (
            <Loader2
              size={14}
              style={{ animation: "spin 0.75s linear infinite" }}
            />
          ) : (
            <Save size={14} />
          )}
          Save Changes
        </button>
      </div>

      {mutation.isError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: S.radiusSm,
            color: "#dc2626",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          <AlertCircle size={14} /> {mutation.error?.message}
        </div>
      )}
      {success && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "10px 14px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: S.radiusSm,
            color: "#16a34a",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          <CheckCircle2 size={14} /> Settings saved successfully!
        </div>
      )}

      {/* Basic Info */}
      <FormSection icon={Store} title="Basic Information" color="#2563eb">
        <Field label="Store Name *">
          <input
            name="name"
            value={form.name}
            onChange={ch}
            style={iStyle}
            onFocus={onF}
            onBlur={onB}
          />
        </Field>
        <Field label="Description">
          <textarea
            name="description"
            value={form.description}
            onChange={ch}
            rows={3}
            style={{
              ...iStyle,
              minHeight: "80px",
              resize: "vertical",
              paddingTop: "10px",
            }}
            onFocus={onF}
            onBlur={onB}
          />
        </Field>
        <Field label="Currency">
          <select
            name="currency"
            value={form.currency}
            onChange={ch}
            style={{ ...iStyle, cursor: "pointer" }}
            onFocus={onF}
            onBlur={onB}
          >
            <option value="BDT">BDT (৳) — Bangladeshi Taka</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="INR">INR (₹)</option>
          </select>
        </Field>
      </FormSection>

      {/* Logo */}
      <FormSection icon={Image} title="Logo & Branding" color="#7c3aed">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "12px",
              border: `2px dashed ${S.border}`,
              background: S.surface,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {form.logo_url ? (
              <img
                src={form.logo_url}
                alt="Logo"
                style={{ width: "64px", height: "64px", objectFit: "contain" }}
              />
            ) : (
              <Store size={24} style={{ color: "#d1d5db" }} />
            )}
          </div>
          <div>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                padding: "8px 14px",
                borderRadius: S.radiusSm,
                border: `1.5px solid ${S.border}`,
                background: "#fff",
                fontSize: "13px",
                fontWeight: "500",
                color: S.muted,
              }}
            >
              <Upload size={13} />
              {uploading ? "Uploading…" : "Upload Logo"}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: "none" }}
              />
            </label>
            <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "5px" }}>
              PNG, JPG, SVG · Recommended: 200×200px
            </p>
          </div>
        </div>
        <Field label="Logo URL">
          <input
            value={form.logo_url}
            onChange={(e) =>
              setForm((f) => ({ ...f, logo_url: e.target.value }))
            }
            placeholder="https://..."
            style={iStyle}
            onFocus={onF}
            onBlur={onB}
          />
        </Field>
        <Field label="Logo Text (shown in header if no image)">
          <input
            value={themeConfig.logo_text ?? ""}
            onChange={setTC("logo_text")}
            placeholder={form.name || "Your Store"}
            style={iStyle}
            onFocus={onF}
            onBlur={onB}
          />
        </Field>
      </FormSection>

      {/* Contact */}
      <FormSection icon={Phone} title="Contact Information" color="#16a34a">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <Field label="Contact Email">
            <input
              name="contact_email"
              type="email"
              value={form.contact_email}
              onChange={ch}
              placeholder="hello@yourstore.com"
              style={iStyle}
              onFocus={onF}
              onBlur={onB}
            />
          </Field>
          <Field label="Contact Phone">
            <input
              name="contact_phone"
              type="tel"
              value={form.contact_phone}
              onChange={ch}
              placeholder="01XXXXXXXXX"
              style={iStyle}
              onFocus={onF}
              onBlur={onB}
            />
          </Field>
        </div>
        <Field label="WhatsApp Number (for storefront floating button)">
          <div style={{ position: "relative" }}>
            <MessageCircle
              size={15}
              style={{
                position: "absolute",
                left: "11px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#25d366",
              }}
            />
            <input
              value={themeConfig.whatsapp_number ?? ""}
              onChange={setTC("whatsapp_number")}
              placeholder="880171XXXXXXX"
              style={{ ...iStyle, paddingLeft: "36px" }}
              onFocus={onF}
              onBlur={onB}
            />
          </div>
          <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
            With country code, no + sign. e.g. 880171XXXXXXX
          </p>
        </Field>
      </FormSection>

      {/* Social Links */}
      <FormSection icon={Globe} title="Social Links" color="#1877f2">
        {[
          {
            key: "facebook_url",
            label: "Facebook Page URL",
            icon: Facebook,
            placeholder: "https://facebook.com/yourpage",
          },
          {
            key: "instagram_url",
            label: "Instagram URL",
            icon: Instagram,
            placeholder: "https://instagram.com/yourhandle",
          },
          {
            key: "tiktok_url",
            label: "TikTok URL",
            icon: Link,
            placeholder: "https://tiktok.com/@yourhandle",
          },
          {
            key: "youtube_url",
            label: "YouTube Channel",
            icon: Youtube,
            placeholder: "https://youtube.com/@yourchannel",
          },
        ].map(({ key, label, icon: Icon, placeholder }) => (
          <Field key={key} label={label}>
            <div style={{ position: "relative" }}>
              <Icon
                size={14}
                style={{
                  position: "absolute",
                  left: "11px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                }}
              />
              <input
                value={themeConfig[key] ?? ""}
                onChange={setTC(key)}
                placeholder={placeholder}
                style={{ ...iStyle, paddingLeft: "34px" }}
                onFocus={onF}
                onBlur={onB}
              />
            </div>
          </Field>
        ))}
      </FormSection>

      {/* Storefront Hero */}
      <FormSection icon={Palette} title="Storefront Hero" color="#d97706">
        {/* Hero image */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              width: "100px",
              height: "64px",
              borderRadius: "10px",
              border: `2px dashed ${S.border}`,
              background: S.surface,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {themeConfig.hero_image_url ? (
              <img
                src={themeConfig.hero_image_url}
                alt="Hero"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Image size={20} style={{ color: "#d1d5db" }} />
            )}
          </div>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              padding: "8px 14px",
              borderRadius: S.radiusSm,
              border: `1.5px solid ${S.border}`,
              background: "#fff",
              fontSize: "13px",
              fontWeight: "500",
              color: S.muted,
            }}
          >
            <Upload size={13} />
            {uploading ? "Uploading…" : "Upload Hero Image"}
            <input
              type="file"
              accept="image/*"
              onChange={handleHeroImgUpload}
              style={{ display: "none" }}
            />
          </label>
        </div>
        <Field label="Hero Headline">
          <input
            value={themeConfig.hero_heading ?? ""}
            onChange={setTC("hero_heading")}
            placeholder="অরিজিনাল প্রোডাক্ট, দ্রুত ডেলিভারি"
            style={iStyle}
            onFocus={onF}
            onBlur={onB}
          />
        </Field>
        <Field label="Hero Subheadline">
          <input
            value={themeConfig.hero_subheading ?? ""}
            onChange={setTC("hero_subheading")}
            placeholder="সারা বাংলাদেশে ক্যাশ অন ডেলিভারি।"
            style={iStyle}
            onFocus={onF}
            onBlur={onB}
          />
        </Field>
      </FormSection>

      {/* Theme / Accent Color */}
      <FormSection
        icon={Palette}
        title="Brand Color"
        color="var(--accent, #5B21B6)"
      >
        <p style={{ fontSize: "12.5px", color: S.muted, marginBottom: "14px" }}>
          The accent color controls buttons, links, and highlights throughout
          the entire platform.
        </p>
        {/* Presets */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          {THEME_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                Object.entries(p.vars).forEach(([k, v]) => setTCVal(k, v));
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "7px 12px",
                borderRadius: "99px",
                border: `1.5px solid ${S.border}`,
                background: "#fff",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                color: S.muted,
              }}
            >
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: p.vars["--accent"],
                  flexShrink: 0,
                }}
              />
              {p.label}
            </button>
          ))}
        </div>
        {/* Custom color picker */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Field label="Custom Accent Color">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="color"
                value={themeConfig["--accent"] ?? "#5B21B6"}
                onChange={(e) => setTCVal("--accent", e.target.value)}
                style={{
                  width: "44px",
                  height: "36px",
                  padding: "2px",
                  border: `1.5px solid ${S.border}`,
                  borderRadius: S.radiusSm,
                  cursor: "pointer",
                }}
              />
              <input
                value={themeConfig["--accent"] ?? ""}
                onChange={(e) => setTCVal("--accent", e.target.value)}
                placeholder="#5B21B6"
                style={{ ...iStyle, width: "140px", fontFamily: "monospace" }}
                onFocus={onF}
                onBlur={onB}
              />
            </div>
          </Field>
        </div>
        <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
          Tip: After saving, reload the page to see the new accent color applied
          everywhere.
        </p>
      </FormSection>

      {/* Bottom save */}
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        style={{
          width: "100%",
          padding: "14px",
          background: "var(--accent, #5B21B6)",
          color: "#fff",
          border: "none",
          borderRadius: S.radius,
          fontSize: "15px",
          fontWeight: "700",
          cursor: mutation.isPending ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          opacity: mutation.isPending ? 0.7 : 1,
        }}
      >
        {mutation.isPending ? (
          <Loader2
            size={16}
            style={{ animation: "spin 0.75s linear infinite" }}
          />
        ) : (
          <Save size={16} />
        )}
        Save All Settings
      </button>

      <style
        jsx
        global
      >{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
