"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import {
  CreditCard,
  Truck,
  MessageSquare,
  Zap,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Info,
  CheckCircle2,
  Globe,
  Facebook,
  Layers,
  Radio,
  Loader2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

// ─── Style tokens ────────────────────────────────────────────────────────────
const S = {
  radius: "10px",
  radiusSm: "7px",
  border: "#e5e7eb",
  borderSub: "#f3f4f6",
  text: "#111827",
  muted: "#6b7280",
  faint: "#9ca3af",
  surface: "#f9fafb",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.07)",
};

// ─── Category metadata ────────────────────────────────────────────────────────
const CATEGORY_META = {
  payment: {
    label: "Payments",
    icon: CreditCard,
    color: "#2563eb",
    bg: "#eff6ff",
  },
  logistics: { label: "Courier", icon: Truck, color: "#7c3aed", bg: "#f5f3ff" },
  sms: { label: "SMS", icon: MessageSquare, color: "#d97706", bg: "#fffbeb" },
};

// ─── Marketing / Tracking fields ──────────────────────────────────────────────
const TRACKING_SECTIONS = [
  {
    key: "facebook",
    label: "Facebook",
    icon: () => <span style={{ fontSize: "14px" }}>ⓕ</span>,
    color: "#1877f2",
    fields: [
      {
        key: "fb_pixel_id",
        label: "Pixel ID",
        placeholder: "123456789012345",
        help: "Events Manager → Pixel → Settings → Pixel ID.",
      },
      {
        key: "fb_capi_token",
        label: "Conversions API Access Token",
        placeholder: "EAABsbCS...",
        help: "Events Manager → Pixel → Settings → Conversions API → Generate Access Token.",
      },
      {
        key: "fb_domain_code",
        label: "Domain Verification Code",
        placeholder: "abcdefgh12345678",
        help: "Paste only the content= value from the Meta verification meta tag.",
      },
    ],
  },
  {
    key: "google",
    label: "Google",
    icon: Globe,
    color: "#ea4335",
    fields: [
      {
        key: "gtm_id",
        label: "Tag Manager Container ID",
        placeholder: "GTM-XXXXXXX",
        help: "GTM workspace URL. Format: GTM-XXXXXXX.",
      },
      {
        key: "ga4_id",
        label: "GA4 Measurement ID",
        placeholder: "G-XXXXXXXXXX",
        help: "Analytics → Admin → Data Streams. Format: G-XXXXXXXXXX.",
      },
      {
        key: "gsc_code",
        label: "Search Console Verification Code",
        placeholder: "ABCDE12345",
        help: "Paste only the content= value from the Google HTML tag verification.",
      },
    ],
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: () => <span style={{ fontSize: "12px", fontWeight: "900" }}>TT</span>,
    color: "#000",
    fields: [
      {
        key: "tt_pixel_id",
        label: "Pixel ID",
        placeholder: "XXXXXXXXXXXXXXXX",
        help: "TikTok Ads → Library → Pixel.",
      },
      {
        key: "tt_events_token",
        label: "Events API Access Token",
        placeholder: "eyJh...",
        help: "TikTok Ads → Library → Pixel → Events API Access Token.",
      },
    ],
  },
  {
    key: "snapchat",
    label: "Snapchat",
    icon: () => <span style={{ fontSize: "13px" }}>👻</span>,
    color: "#FFFC00",
    fields: [
      {
        key: "snap_pixel_id",
        label: "Pixel ID",
        placeholder: "XXXXXXXX-XXXX-XXXX",
        help: "Snap Ads Manager → Events Manager → Pixel.",
      },
    ],
  },
  {
    key: "other",
    label: "Other",
    icon: Layers,
    color: "#6b7280",
    fields: [
      {
        key: "whatsapp_number",
        label: "WhatsApp Number",
        placeholder: "880171XXXXXXX",
        help: "With country code, no +. e.g. 880171XXXXXXX. Powers the storefront WhatsApp button.",
      },
      {
        key: "messenger_page_id",
        label: "Messenger Page ID",
        placeholder: "12345678901",
        help: "Facebook Page ID → Settings → About → Page ID.",
      },
    ],
  },
];

// ─── Micro components ─────────────────────────────────────────────────────────

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: "36px",
        height: "20px",
        borderRadius: "99px",
        border: "none",
        background: on ? "var(--accent, #5B21B6)" : "#d1d5db",
        padding: "2px",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 150ms",
        display: "flex",
        alignItems: "center",
        opacity: disabled ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
          transform: on ? "translateX(16px)" : "translateX(0)",
          transition: "transform 150ms",
          display: "block",
        }}
      />
    </button>
  );
}

function Tooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        verticalAlign: "middle",
      }}
    >
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        style={{
          background: "none",
          border: "none",
          padding: "1px 2px",
          cursor: "help",
          color: S.faint,
          display: "flex",
        }}
      >
        <Info size={12} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "230px",
            background: "#1e293b",
            color: "#e2e8f0",
            borderRadius: "8px",
            padding: "8px 10px",
            fontSize: "11.5px",
            lineHeight: "1.5",
            zIndex: 999,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            pointerEvents: "none",
          }}
        >
          {text}
          <div
            style={{
              position: "absolute",
              bottom: "-5px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "10px",
              height: "10px",
              background: "#1e293b",
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
            }}
          />
        </div>
      )}
    </span>
  );
}

function SecretInput({ value, onChange, placeholder, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "8px 34px 8px 10px",
          border: `1.5px solid ${S.border}`,
          borderRadius: S.radiusSm,
          fontSize: "13px",
          fontFamily: "ui-monospace,monospace",
          color: S.text,
          background: disabled ? S.surface : "#fff",
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 120ms",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--accent, #5B21B6)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = S.border;
        }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        style={{
          position: "absolute",
          right: "8px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: S.faint,
          display: "flex",
        }}
      >
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

function FieldInput({ field, value, onChange, disabled }) {
  const inputBase = {
    width: "100%",
    padding: "8px 10px",
    border: `1.5px solid ${S.border}`,
    borderRadius: S.radiusSm,
    fontSize: "13px",
    color: S.text,
    background: disabled ? S.surface : "#fff",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "border-color 120ms",
  };
  const onF = (e) => {
    e.target.style.borderColor = "var(--accent, #5B21B6)";
  };
  const onB = (e) => {
    e.target.style.borderColor = S.border;
  };

  if (field.type === "toggle") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Toggle
          on={Boolean(value ?? field.default ?? false)}
          onChange={onChange}
          disabled={disabled}
        />
        <span style={{ fontSize: "13px", color: S.muted, fontWeight: "500" }}>
          {field.label}
        </span>
      </div>
    );
  }
  if (field.type === "select") {
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ ...inputBase, cursor: "pointer" }}
        onFocus={onF}
        onBlur={onB}
      >
        <option value="">Select…</option>
        {(field.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "secret") {
    return (
      <SecretInput
        value={value}
        onChange={onChange}
        placeholder={field.placeholder}
        disabled={disabled}
      />
    );
  }
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      style={inputBase}
      onFocus={onF}
      onBlur={onB}
    />
  );
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({ integration, onLogs }) {
  const [expanded, setExpanded] = useState(false);
  const [formValues, setFormValues] = useState({});
  const [savedOk, setSavedOk] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const qc = useQueryClient();

  const saveMut = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/integrations", {
        method: "POST",
        body: JSON.stringify({
          integration: integration.id,
          fieldValues: formValues,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      return json;
    },
    onSuccess: () => {
      setSavedOk(true);
      setSaveErr("");
      setTimeout(() => setSavedOk(false), 3000);
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (e) => setSaveErr(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async (val) => {
      const res = await authFetch(
        `/api/integrations/${integration.id}/toggle`,
        { method: "POST", body: JSON.stringify({ isActive: val }) },
      );
      if (!res.ok) throw new Error("Toggle failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const handleExpand = () => {
    if (!expanded && integration.public_config)
      setFormValues((p) => ({ ...p, ...integration.public_config }));
    setExpanded((e) => !e);
  };

  const credFields = (integration.fields ?? []).filter(
    (f) => f.type !== "toggle",
  );
  const toggleFields = (integration.fields ?? []).filter(
    (f) => f.type === "toggle",
  );
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://your-domain.com";

  return (
    <div
      style={{
        border: `1.5px solid ${integration.is_active ? "#ddd6fe" : S.border}`,
        borderRadius: S.radius,
        background: "#fff",
        boxShadow: S.shadow,
        overflow: "hidden",
        transition: "box-shadow 150ms",
      }}
    >
      {/* Header */}
      <div
        onClick={handleExpand}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 16px",
          cursor: "pointer",
          background: expanded ? S.surface : "#fff",
          transition: "background 120ms",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            flexShrink: 0,
            background: integration.is_active ? "#22c55e" : "#d1d5db",
            boxShadow: integration.is_active
              ? "0 0 0 3px rgba(34,197,94,0.15)"
              : "none",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{ fontSize: "14px", fontWeight: "600", color: S.text }}
            >
              {integration.label}
            </span>
            {integration.configured && (
              <span
                style={{
                  fontSize: "10.5px",
                  padding: "1px 7px",
                  borderRadius: "99px",
                  background: "#f0fdf4",
                  color: "#166534",
                  border: "1px solid #bbf7d0",
                  fontWeight: "600",
                }}
              >
                Configured
              </span>
            )}
            {integration.is_active && (
              <span
                style={{
                  fontSize: "10.5px",
                  padding: "1px 7px",
                  borderRadius: "99px",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  fontWeight: "600",
                }}
              >
                Active
              </span>
            )}
          </div>
          <p style={{ fontSize: "12px", color: S.muted, marginTop: "2px" }}>
            {integration.description}
          </p>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Toggle
            on={integration.is_active}
            onChange={(val) => toggleMut.mutate(val)}
            disabled={!integration.configured || toggleMut.isPending}
          />
          {integration.docsUrl && (
            <a
              href={integration.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: S.faint, display: "flex" }}
            >
              <ExternalLink size={13} />
            </a>
          )}
          <span style={{ color: S.faint }}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${S.border}`, padding: "16px" }}>
          {/* Callback URL */}
          <div
            style={{
              background: S.surface,
              border: `1px solid ${S.border}`,
              borderRadius: S.radiusSm,
              padding: "10px 12px",
              marginBottom: "16px",
            }}
          >
            <p
              style={{
                fontSize: "10.5px",
                fontWeight: "700",
                color: S.muted,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: "4px",
              }}
            >
              Callback URL
            </p>
            <code
              style={{
                fontSize: "11.5px",
                color: "#6366f1",
                fontFamily: "ui-monospace,monospace",
                wordBreak: "break-all",
              }}
            >
              {origin}/api/callbacks/{integration.id}/ipn
            </code>
          </div>

          {/* Credential fields */}
          {credFields.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
                marginBottom: "14px",
              }}
            >
              {credFields.map((f) => (
                <div key={f.key}>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: S.muted,
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    {f.label}
                  </label>
                  <FieldInput
                    field={f}
                    value={formValues[f.key]}
                    onChange={(v) =>
                      setFormValues((p) => ({ ...p, [f.key]: v }))
                    }
                    disabled={saveMut.isPending}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Toggle fields */}
          {toggleFields.length > 0 && (
            <div
              style={{
                borderTop: `1px solid ${S.borderSub}`,
                paddingTop: "12px",
                marginBottom: "14px",
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              {toggleFields.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={formValues[f.key] ?? f.default}
                  onChange={(v) => setFormValues((p) => ({ ...p, [f.key]: v }))}
                  disabled={saveMut.isPending}
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  background: "var(--accent, #5B21B6)",
                  color: "#fff",
                  border: "none",
                  borderRadius: S.radiusSm,
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: saveMut.isPending ? "not-allowed" : "pointer",
                  opacity: saveMut.isPending ? 0.7 : 1,
                }}
              >
                {saveMut.isPending && (
                  <Loader2
                    size={12}
                    style={{ animation: "spin 0.75s linear infinite" }}
                  />
                )}
                Save Credentials
              </button>
              {integration.configured && (
                <button
                  onClick={() => onLogs(integration.id)}
                  style={{
                    padding: "8px 14px",
                    background: "none",
                    border: `1.5px solid ${S.border}`,
                    borderRadius: S.radiusSm,
                    fontSize: "13px",
                    color: S.muted,
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                >
                  View Logs
                </button>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {savedOk && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    color: "#16a34a",
                    fontSize: "12.5px",
                    fontWeight: "600",
                  }}
                >
                  <CheckCircle2 size={13} /> Saved & encrypted
                </span>
              )}
              {saveErr && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    color: "#dc2626",
                    fontSize: "12.5px",
                  }}
                >
                  <AlertCircle size={13} /> {saveErr}
                </span>
              )}
              <span style={{ fontSize: "11px", color: S.faint }}>
                {integration.updated_at
                  ? `Last saved ${new Date(integration.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : "Not configured"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tracking Section ─────────────────────────────────────────────────────────

function TrackingSection() {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});
  const [err, setErr] = useState("");

  useQuery({
    queryKey: ["store-tracking"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/store");
      if (!res.ok) return {};
      const json = await res.json();
      const tc = (json.data ?? json)?.theme_config ?? {};
      setValues(tc);
      return tc;
    },
    staleTime: 300000,
  });

  const saveField = async (key) => {
    setSaving((p) => ({ ...p, [key]: true }));
    setErr("");
    try {
      const res = await authFetch("/api/admin/store", {
        method: "PATCH",
        body: JSON.stringify({ theme_config: { [key]: values[key] ?? "" } }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed");
      }
      setSaved((p) => ({ ...p, [key]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 4000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving((p) => ({ ...p, [key]: false }));
    }
  };

  const saveAll = async () => {
    for (const section of TRACKING_SECTIONS) {
      for (const field of section.fields) {
        await saveField(field.key);
      }
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: S.text,
              marginBottom: "2px",
            }}
          >
            Marketing & Tracking
          </h2>
          <p style={{ fontSize: "12.5px", color: S.muted }}>
            All pixel IDs are automatically injected into your storefront head.
            No code editing required.
          </p>
        </div>
        <button
          onClick={saveAll}
          style={{
            padding: "8px 16px",
            background: "var(--accent, #5B21B6)",
            color: "#fff",
            border: "none",
            borderRadius: S.radiusSm,
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Save All
        </button>
      </div>
      {err && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "10px 12px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: S.radiusSm,
            color: "#dc2626",
            fontSize: "12.5px",
            marginBottom: "12px",
          }}
        >
          <AlertCircle size={13} /> {err}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {TRACKING_SECTIONS.map((section) => {
          const Icon = section.icon;
          const configCount = section.fields.filter(
            (f) => values[f.key],
          ).length;
          return (
            <div
              key={section.key}
              style={{
                border: `1.5px solid ${S.border}`,
                borderRadius: S.radius,
                background: "#fff",
                boxShadow: S.shadow,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  background: S.surface,
                  borderBottom: `1px solid ${S.border}`,
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "7px",
                    background:
                      section.key === "snapchat" ? "#000" : section.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  <Icon color="#fff" />
                </div>
                <span
                  style={{
                    fontSize: "13.5px",
                    fontWeight: "700",
                    color: S.text,
                  }}
                >
                  {section.label}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: S.faint,
                    marginLeft: "auto",
                  }}
                >
                  {configCount}/{section.fields.length} configured
                </span>
              </div>
              <div
                style={{
                  padding: "14px 16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "14px",
                }}
              >
                {section.fields.map((field) => (
                  <div key={field.key}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        marginBottom: "4px",
                      }}
                    >
                      <label
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: S.muted,
                        }}
                      >
                        {field.label}
                      </label>
                      <Tooltip text={field.help} />
                      {saved[field.key] && (
                        <CheckCircle2 size={12} style={{ color: "#16a34a" }} />
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "7px" }}>
                      <input
                        type="text"
                        value={values[field.key] ?? ""}
                        onChange={(e) => {
                          setValues((p) => ({
                            ...p,
                            [field.key]: e.target.value,
                          }));
                          setSaved((p) => ({ ...p, [field.key]: false }));
                        }}
                        placeholder={field.placeholder}
                        onBlur={() => saveField(field.key)}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          border: `1.5px solid ${S.border}`,
                          borderRadius: S.radiusSm,
                          fontSize: "12.5px",
                          fontFamily: "ui-monospace,monospace",
                          color: S.text,
                          outline: "none",
                          transition: "border-color 120ms",
                          background: "#fff",
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = "var(--accent, #5B21B6)";
                        }}
                        onBlurCapture={(e) => {
                          e.target.style.borderColor = S.border;
                        }}
                      />
                      <button
                        onClick={() => saveField(field.key)}
                        disabled={saving[field.key]}
                        style={{
                          padding: "8px 12px",
                          background: "var(--accent, #5B21B6)",
                          color: "#fff",
                          border: "none",
                          borderRadius: S.radiusSm,
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: saving[field.key] ? "not-allowed" : "pointer",
                          opacity: saving[field.key] ? 0.7 : 1,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          flexShrink: 0,
                        }}
                      >
                        {saving[field.key] ? (
                          <Loader2
                            size={11}
                            style={{ animation: "spin 0.75s linear infinite" }}
                          />
                        ) : (
                          <Check size={11} />
                        )}
                        Save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Logs Drawer ──────────────────────────────────────────────────────────────

function LogsDrawer({ integrationId, onClose }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["ipn-logs", integrationId],
    queryFn: async () => {
      const res = await authFetch(
        `/api/integrations/${integrationId}/logs?limit=50`,
      );
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!integrationId,
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: "min(500px,100vw)",
          background: "#fff",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 200ms ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "18px 20px",
            borderBottom: `1px solid ${S.border}`,
          }}
        >
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: S.text }}>
              IPN Logs
            </h3>
            <p
              style={{
                fontSize: "12px",
                color: S.muted,
                fontFamily: "monospace",
              }}
            >
              {integrationId}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: S.muted,
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "40px",
              }}
            >
              <Loader2
                size={20}
                style={{
                  animation: "spin 0.75s linear infinite",
                  color: S.faint,
                }}
              />
            </div>
          ) : !logs.length ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <Radio
                size={32}
                style={{
                  margin: "0 auto 12px",
                  display: "block",
                  color: "#d1d5db",
                }}
              />
              <p
                style={{ fontSize: "14px", fontWeight: "600", color: S.muted }}
              >
                No events yet
              </p>
              <p
                style={{ fontSize: "12.5px", color: S.faint, marginTop: "4px" }}
              >
                Callbacks will appear here when payment providers send
                notifications.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    border: `1px solid ${S.border}`,
                    borderRadius: S.radiusSm,
                    padding: "10px 12px",
                    background: S.surface,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "2px 8px",
                        borderRadius: "99px",
                        background: log.verified ? "#f0fdf4" : "#fef2f2",
                        color: log.verified ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {log.verified ? "Verified" : "Failed"}
                    </span>
                    <span style={{ fontSize: "11px", color: S.faint }}>
                      {new Date(log.received_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "12.5px",
                      color: S.text,
                      fontWeight: "500",
                    }}
                  >
                    {log.action_taken ?? "—"}
                  </p>
                  {log.order_number && (
                    <p
                      style={{
                        fontSize: "11.5px",
                        color: S.muted,
                        fontFamily: "monospace",
                      }}
                    >
                      Order: {log.order_number}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminIntegrationsPage() {
  const [tab, setTab] = useState("all");
  const [logsId, setLogsId] = useState(null);

  const {
    data: integrations = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const res = await authFetch("/api/integrations");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.data ?? json;
    },
  });

  const grouped = integrations.reduce((acc, i) => {
    const cat = i.category ?? "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(i);
    return acc;
  }, {});

  const activeCount = integrations.filter((i) => i.is_active).length;
  const configCount = integrations.filter((i) => i.configured).length;

  const tabs = [
    { key: "all", label: "All Integrations", count: integrations.length },
    { key: "payment", label: "Payments", count: grouped.payment?.length ?? 0 },
    {
      key: "logistics",
      label: "Courier",
      count: grouped.logistics?.length ?? 0,
    },
    { key: "sms", label: "SMS", count: grouped.sms?.length ?? 0 },
    { key: "tracking", label: "Marketing & Tracking", count: null },
  ];

  const visibleCategories =
    tab === "all"
      ? Object.keys(CATEGORY_META).filter((k) => grouped[k]?.length)
      : [tab];

  return (
    <div
      style={{
        maxWidth: "860px",
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
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "24px",
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
            Integrations
          </h1>
          <p style={{ fontSize: "13px", color: S.muted }}>
            {isLoading
              ? "Loading…"
              : `${configCount} configured · ${activeCount} active · ${integrations.length} available`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            border: `1.5px solid ${S.border}`,
            borderRadius: S.radiusSm,
            background: "#fff",
            color: S.muted,
            fontSize: "13px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          <RefreshCw
            size={13}
            style={{
              animation: isRefetching ? "spin 0.8s linear infinite" : "none",
            }}
          />{" "}
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "24px",
          overflowX: "auto",
          paddingBottom: "2px",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "99px",
              border: `1.5px solid ${tab === t.key ? "var(--accent, #5B21B6)" : S.border}`,
              background:
                tab === t.key ? "var(--accent-muted, #EDE9FE)" : "#fff",
              color: tab === t.key ? "var(--accent, #5B21B6)" : S.muted,
              fontSize: "12.5px",
              fontWeight: tab === t.key ? "700" : "500",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 110ms",
            }}
          >
            {t.label}
            {t.count !== null && (
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: "700",
                  background:
                    tab === t.key ? "var(--accent, #5B21B6)" : S.surface,
                  color: tab === t.key ? "#fff" : S.faint,
                  borderRadius: "99px",
                  padding: "1px 6px",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                height: "66px",
                borderRadius: S.radius,
                background:
                  "linear-gradient(90deg,#f3f4f6 25%,#e9ebee 50%,#f3f4f6 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
              }}
            />
          ))}
        </div>
      ) : isError ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "#dc2626",
          }}
        >
          <AlertCircle
            size={32}
            style={{ margin: "0 auto 12px", display: "block" }}
          />
          <p style={{ fontSize: "15px", fontWeight: "600" }}>
            Failed to load integrations
          </p>
          <button
            onClick={() => refetch()}
            style={{
              marginTop: "12px",
              padding: "9px 18px",
              background: "var(--accent, #5B21B6)",
              color: "#fff",
              border: "none",
              borderRadius: S.radiusSm,
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      ) : tab === "tracking" ? (
        <TrackingSection />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {visibleCategories.map((catKey) => {
            const items = grouped[catKey];
            if (!items?.length) return null;
            const meta = CATEGORY_META[catKey] ?? {
              label: catKey,
              icon: Zap,
              color: "#6b7280",
              bg: "#f9fafb",
            };
            const CatIcon = meta.icon;
            return (
              <div key={catKey}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "7px",
                      background: meta.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CatIcon size={14} style={{ color: meta.color }} />
                  </div>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: S.text,
                    }}
                  >
                    {meta.label}
                  </span>
                  <span style={{ fontSize: "11.5px", color: S.faint }}>
                    ({items.length})
                  </span>
                  <div
                    style={{ flex: 1, height: "1px", background: S.border }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {items.map((integ) => (
                    <IntegrationCard
                      key={integ.id}
                      integration={integ}
                      onLogs={(id) => setLogsId(id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {logsId && (
        <LogsDrawer integrationId={logsId} onClose={() => setLogsId(null)} />
      )}

      <style jsx global>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
      `}</style>
    </div>
  );
}
