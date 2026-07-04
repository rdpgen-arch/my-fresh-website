"use client";
/**
 * Landing Page Builder — Admin
 * Store pages in store theme_config.landing_pages
 * Public URL: /[storeSlug]/lp/[pageSlug]
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import {
  Plus,
  FileText,
  ExternalLink,
  Edit3,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Package,
  ShoppingBag,
  Loader2,
  Check,
  AlertCircle,
  X,
  ArrowLeft,
} from "lucide-react";

// ─── Style tokens ────────────────────────────────────────────────────────────
const S = {
  border: "#e5e7eb",
  borderSub: "#f3f4f6",
  text: "#111827",
  muted: "#6b7280",
  surface: "#f9fafb",
  radius: "10px",
  radiusSm: "7px",
  shadow: "0 1px 3px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.07)",
};

const inputStyle = {
  width: "100%",
  padding: "9px 11px",
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
const onFocus = (e) => {
  e.target.style.borderColor = "var(--accent, #5B21B6)";
};
const onBlur = (e) => {
  e.target.style.borderColor = S.border;
};

function Label({ children, required }) {
  return (
    <label
      style={{
        fontSize: "12.5px",
        fontWeight: "600",
        color: S.muted,
        display: "block",
        marginBottom: "5px",
      }}
    >
      {children}
      {required && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  required,
  multiline,
  rows,
}) {
  const props = {
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
    placeholder,
    style: {
      ...inputStyle,
      ...(multiline
        ? {
            minHeight: `${(rows ?? 3) * 24 + 20}px`,
            resize: "vertical",
            paddingTop: "10px",
          }
        : {}),
    },
    onFocus,
    onBlur,
  };
  return multiline ? <textarea {...props} /> : <input type="text" {...props} />;
}

// ─── Page Form ────────────────────────────────────────────────────────────────

const BLANK_PAGE = {
  id: null,
  title: "",
  slug: "",
  product_id: "",
  headline: "",
  subheadline: "",
  cta_text: "এখনই অর্ডার করুন",
  bullets: ["", "", ""],
  is_active: true,
};

function PageForm({ page, products, storeSlug, onSave, onCancel, saving }) {
  const [form, setForm] = useState(page ?? BLANK_PAGE);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setBullet = (i, v) =>
    setForm((f) => {
      const bullets = [...(f.bullets ?? ["", "", ""])];
      bullets[i] = v;
      return { ...f, bullets };
    });
  const addBullet = () =>
    setForm((f) => ({ ...f, bullets: [...(f.bullets ?? []), ""] }));
  const removeBullet = (i) =>
    setForm((f) => {
      const b = [...f.bullets];
      b.splice(i, 1);
      return { ...f, bullets: b };
    });

  const selectedProduct = products.find((p) => p.id === form.product_id);

  const handleSlugChange = (v) => {
    set("slug")(
      v
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/--+/g, "-"),
    );
  };

  const autoSlug = () => {
    if (!form.slug && form.title) {
      set("slug")(
        form.title
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, "")
          .replace(/\s+/g, "-")
          .slice(0, 60),
      );
    }
  };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: S.muted,
            display: "flex",
            padding: "4px",
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <h2 style={{ fontSize: "18px", fontWeight: "700", color: S.text }}>
          {form.id ? "Edit Landing Page" : "Create Landing Page"}
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Product */}
        <div>
          <Label required>Product</Label>
          <select
            value={form.product_id}
            onChange={(e) => set("product_id")(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            <option value="">Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Page title + slug */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
          }}
        >
          <div>
            <Label required>Page Title</Label>
            <TextInput
              value={form.title}
              onChange={set("title")}
              placeholder="Summer Sale Page"
              onBlur={autoSlug}
            />
          </div>
          <div>
            <Label required>URL Slug</Label>
            <div style={{ position: "relative" }}>
              <TextInput
                value={form.slug}
                onChange={handleSlugChange}
                placeholder="summer-sale"
              />
            </div>
            {form.slug && storeSlug && (
              <p
                style={{
                  fontSize: "11px",
                  color: S.muted,
                  marginTop: "4px",
                  fontFamily: "monospace",
                }}
              >
                /{storeSlug}/lp/{form.slug}
              </p>
            )}
          </div>
        </div>

        {/* Headline */}
        <div>
          <Label required>Headline</Label>
          <TextInput
            value={form.headline}
            onChange={set("headline")}
            placeholder="এই সুযোগ মিস করবেন না!"
          />
        </div>

        {/* Subheadline */}
        <div>
          <Label>Subheadline</Label>
          <TextInput
            value={form.subheadline}
            onChange={set("subheadline")}
            placeholder="অরিজিনাল প্রোডাক্ট, দ্রুত ডেলিভারি, ক্যাশ অন ডেলিভারি।"
          />
        </div>

        {/* Bullet points */}
        <div>
          <Label>Benefit Bullets (3–5 points)</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(form.bullets ?? []).map((b, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: "7px", alignItems: "center" }}
              >
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "var(--accent-muted, #EDE9FE)",
                    color: "var(--accent, #5B21B6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "700",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={b}
                  onChange={(e) => setBullet(i, e.target.value)}
                  placeholder={`Benefit ${i + 1}…`}
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
                <button
                  onClick={() => removeBullet(i)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: S.muted,
                    display: "flex",
                    padding: "4px",
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            {(form.bullets?.length ?? 0) < 5 && (
              <button
                onClick={addBullet}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  background: "none",
                  border: `1.5px dashed ${S.border}`,
                  borderRadius: S.radiusSm,
                  color: S.muted,
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                <Plus size={14} /> Add bullet
              </button>
            )}
          </div>
        </div>

        {/* CTA text */}
        <div>
          <Label>CTA Button Text</Label>
          <TextInput
            value={form.cta_text}
            onChange={set("cta_text")}
            placeholder="এখনই অর্ডার করুন"
          />
        </div>

        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => set("is_active")(!form.is_active)}
            style={{
              width: "36px",
              height: "20px",
              borderRadius: "99px",
              background: form.is_active ? "var(--accent, #5B21B6)" : "#d1d5db",
              border: "none",
              padding: "2px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transition: "background 150ms",
            }}
          >
            <span
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: "#fff",
                transform: form.is_active
                  ? "translateX(16px)"
                  : "translateX(0)",
                transition: "transform 150ms",
                display: "block",
              }}
            />
          </button>
          <span style={{ fontSize: "13px", color: S.muted, fontWeight: "500" }}>
            Active (visible to customers)
          </span>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
            paddingTop: "4px",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              border: `1.5px solid ${S.border}`,
              borderRadius: S.radiusSm,
              background: "#fff",
              color: S.muted,
              fontSize: "13.5px",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.title || !form.slug || !form.product_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "10px 22px",
              border: "none",
              borderRadius: S.radiusSm,
              background: "var(--accent, #5B21B6)",
              color: "#fff",
              fontSize: "13.5px",
              fontWeight: "700",
              cursor: saving ? "not-allowed" : "pointer",
              opacity:
                saving || !form.title || !form.slug || !form.product_id
                  ? 0.65
                  : 1,
            }}
          >
            {saving ? (
              <Loader2
                size={14}
                style={{ animation: "spin 0.75s linear infinite" }}
              />
            ) : (
              <Check size={14} />
            )}
            Save Page
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page Card ────────────────────────────────────────────────────────────────

function PageCard({ page, storeSlug, onEdit, onDelete, onCopyLink }) {
  return (
    <div
      style={{
        border: `1.5px solid ${S.border}`,
        borderRadius: S.radius,
        background: "#fff",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        boxShadow: S.shadow,
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: "var(--accent-muted, #EDE9FE)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <FileText size={18} style={{ color: "var(--accent, #5B21B6)" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <p
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: S.text,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {page.title}
          </p>
          <span
            style={{
              fontSize: "10.5px",
              padding: "2px 8px",
              borderRadius: "99px",
              background: page.is_active ? "#f0fdf4" : "#f9fafb",
              color: page.is_active ? "#16a34a" : S.muted,
              border: `1px solid ${page.is_active ? "#bbf7d0" : S.border}`,
              fontWeight: "600",
              flexShrink: 0,
            }}
          >
            {page.is_active ? "Active" : "Draft"}
          </span>
        </div>
        <p
          style={{
            fontSize: "12px",
            color: S.muted,
            fontFamily: "monospace",
            marginTop: "2px",
          }}
        >
          /{storeSlug}/lp/{page.slug}
        </p>
        <p style={{ fontSize: "11.5px", color: "#9ca3af", marginTop: "2px" }}>
          {page.orders_count ? `${page.orders_count} orders` : "No orders yet"}{" "}
          ·{" "}
          {page.created_at
            ? `Created ${new Date(page.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : ""}
        </p>
      </div>
      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
        <a
          href={`/${storeSlug}/lp/${page.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Preview"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "7px",
            border: `1.5px solid ${S.border}`,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: S.muted,
            textDecoration: "none",
          }}
        >
          <ExternalLink size={14} />
        </a>
        <button
          onClick={() => onCopyLink(page)}
          title="Copy link"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "7px",
            border: `1.5px solid ${S.border}`,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: S.muted,
            cursor: "pointer",
          }}
        >
          <Copy size={14} />
        </button>
        <button
          onClick={() => onEdit(page)}
          title="Edit"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "7px",
            border: `1.5px solid ${S.border}`,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: S.muted,
            cursor: "pointer",
          }}
        >
          <Edit3 size={14} />
        </button>
        <button
          onClick={() => onDelete(page)}
          title="Delete"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "7px",
            border: "1.5px solid #fecaca",
            background: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#dc2626",
            cursor: "pointer",
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LandingPagesAdminPage() {
  const [view, setView] = useState("list"); // list | create | edit
  const [editPage, setEditPage] = useState(null);
  const [copied, setCopied] = useState(null);
  const [err, setErr] = useState("");
  const qc = useQueryClient();

  // Load store meta (for slug and theme_config)
  const { data: storeData } = useQuery({
    queryKey: ["admin-store-meta"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/store");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data ?? json;
    },
    staleTime: 60000,
  });

  const storeSlug = storeData?.slug ?? "";
  const allPages = storeData?.theme_config?.landing_pages ?? [];

  // Load products for the picker
  const { data: productsData } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const res = await authFetch("/api/products?status=published&limit=200");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 120000,
  });
  const products = productsData ?? [];

  // Save mutation — updates theme_config.landing_pages
  const saveMut = useMutation({
    mutationFn: async (pages) => {
      const res = await authFetch("/api/admin/store", {
        method: "PATCH",
        body: JSON.stringify({ theme_config: { landing_pages: pages } }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Save failed");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-store-meta"] });
      setView("list");
      setEditPage(null);
    },
    onError: (e) => setErr(e.message),
  });

  const handleSave = (form) => {
    setErr("");
    const now = new Date().toISOString();
    const updated = form.id
      ? allPages.map((p) =>
          p.id === form.id ? { ...form, updated_at: now } : p,
        )
      : [...allPages, { ...form, id: crypto.randomUUID(), created_at: now }];
    saveMut.mutate(updated);
  };

  const handleDelete = (page) => {
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    saveMut.mutate(allPages.filter((p) => p.id !== page.id));
  };

  const handleCopyLink = (page) => {
    const url = `${window.location.origin}/${storeSlug}/lp/${page.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(page.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (view === "create" || view === "edit") {
    return (
      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "28px 20px 60px",
        }}
      >
        {err && (
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
            <AlertCircle size={13} /> {err}
          </div>
        )}
        <PageForm
          page={view === "edit" ? editPage : null}
          products={products}
          storeSlug={storeSlug}
          onSave={handleSave}
          onCancel={() => {
            setView("list");
            setEditPage(null);
            setErr("");
          }}
          saving={saveMut.isPending}
        />
      </div>
    );
  }

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
            Landing Pages
          </h1>
          <p style={{ fontSize: "13px", color: S.muted }}>
            Create high-converting ad landing pages with embedded checkout.
          </p>
        </div>
        <button
          onClick={() => setView("create")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "10px 18px",
            background: "var(--accent, #5B21B6)",
            color: "#fff",
            border: "none",
            borderRadius: S.radiusSm,
            fontSize: "13.5px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          <Plus size={15} /> Create Page
        </button>
      </div>

      {err && (
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
          <AlertCircle size={13} /> {err}
        </div>
      )}
      {copied && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            padding: "12px 18px",
            background: "#0f172a",
            color: "#fff",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "600",
            zIndex: 100,
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          }}
        >
          ✓ Link copied!
        </div>
      )}

      {/* How it works */}
      <div
        style={{
          background: "var(--accent-muted, #EDE9FE)",
          border: "1px solid var(--accent, #5B21B6)",
          borderRadius: S.radius,
          padding: "14px 16px",
          marginBottom: "24px",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "var(--accent, #5B21B6)",
            marginBottom: "4px",
          }}
        >
          How it works
        </p>
        <p style={{ fontSize: "12.5px", color: "#4c1d95", lineHeight: "1.6" }}>
          Choose a product → fill in the page details → share the link in your
          Facebook/TikTok ads. The page has no header/footer and ends with an
          embedded checkout form — zero friction, maximum conversions.
        </p>
      </div>

      {/* Pages list */}
      {allPages.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
            border: `2px dashed ${S.border}`,
            borderRadius: "16px",
          }}
        >
          <FileText
            size={40}
            style={{
              color: "#d1d5db",
              margin: "0 auto 14px",
              display: "block",
            }}
          />
          <p
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            No landing pages yet
          </p>
          <p style={{ fontSize: "13px", color: S.muted, marginBottom: "20px" }}>
            Create your first landing page for your next ad campaign.
          </p>
          <button
            onClick={() => setView("create")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "10px 20px",
              background: "var(--accent, #5B21B6)",
              color: "#fff",
              border: "none",
              borderRadius: S.radiusSm,
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            <Plus size={15} /> Create First Page
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {allPages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              storeSlug={storeSlug}
              onEdit={(p) => {
                setEditPage(p);
                setView("edit");
              }}
              onDelete={handleDelete}
              onCopyLink={handleCopyLink}
            />
          ))}
        </div>
      )}

      <style
        jsx
        global
      >{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
