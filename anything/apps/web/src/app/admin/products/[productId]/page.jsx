"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  Plus,
  Trash2,
  Package,
  Tag,
} from "lucide-react";
import useUpload from "@/utils/useUpload";
import { authFetch } from "@/utils/authFetch";

function useProductId() {
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("products");
  return parts[idx + 1] ?? null;
}

const inputCls =
  "w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors";

const UPLOADCARE_KEY = process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY;

function AttrEditor({ attrs, onChange }) {
  const entries = Object.entries(attrs);
  const add = () => onChange({ ...attrs, "": "" });
  const remove = (key) => {
    const n = { ...attrs };
    delete n[key];
    onChange(n);
  };
  const rename = (oldKey, newKey, val) => {
    const n = {};
    for (const [k, v] of Object.entries(attrs)) {
      n[k === oldKey ? newKey : k] = k === oldKey ? val : v;
    }
    onChange(n);
  };
  const update = (key, raw) => {
    let val = raw;
    try {
      val = JSON.parse(raw);
    } catch {
      /* keep as string */
    }
    onChange({ ...attrs, [key]: val });
  };
  return (
    <div>
      {entries.map(([k, v]) => {
        const isArr = Array.isArray(v);
        return (
          <div key={k} className="flex gap-2 mb-2">
            <input
              defaultValue={k}
              onBlur={(e) => rename(k, e.target.value, v)}
              placeholder="attribute key"
              className={inputCls + " font-mono"}
            />
            <input
              defaultValue={isArr ? JSON.stringify(v) : String(v)}
              onBlur={(e) => update(k, e.target.value)}
              placeholder={isArr ? '["S","M","L"]' : "value"}
              className={inputCls + " font-mono"}
            />
            <button
              onClick={() => remove(k)}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <Trash2 size={13} />
            </button>
          </div>
        );
      })}
      <button
        onClick={add}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors mt-1"
      >
        <Plus size={11} /> Add Attribute
      </button>
      <p className="text-[10px] text-slate-400 mt-1">
        Array values: use JSON format e.g. ["S","M","L"] · They become selectors
        on the storefront.
      </p>
    </div>
  );
}

export default function ProductEditPage() {
  const qc = useQueryClient();
  const productId = useProductId();
  const isNew = productId === "new";
  const [upload, { loading: uploading }] = useUpload();
  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    currency: "BDT",
    stockQuantity: "0",
    status: "draft",
    image_url: "",
  });
  const [attrs, setAttrs] = useState({});
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Fetch categories for assignment
  const { data: allCategories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/categories");
      if (!res.ok) return [];
      return (await res.json()).data ?? [];
    },
    staleTime: 60000,
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await authFetch(`/api/products/${productId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Not found.");
      return json.data;
    },
    enabled: !!productId && !isNew,
  });

  useEffect(() => {
    if (!product) return;
    setForm({
      name: product.name ?? "",
      sku: product.sku ?? "",
      description: product.description ?? "",
      price: String(product.price ?? ""),
      currency: product.currency ?? "BDT",
      stockQuantity: String(product.stock_quantity ?? 0),
      status: product.status ?? "draft",
      image_url: product.image_url ?? "",
    });
    setAttrs(product.dynamic_attributes ?? {});
    setSelectedCategories(product.category_ids ?? []);
  }, [product]);

  const mutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        sku: form.sku,
        description: form.description,
        price: Number(form.price),
        currency: form.currency,
        stockQuantity: Number(form.stockQuantity),
        status: form.status,
        image_url: form.image_url || null,
        dynamicAttributes: attrs,
      };
      const res = await authFetch(
        isNew ? "/api/products" : `/api/products/${productId}`,
        {
          method: isNew ? "POST" : "PATCH",
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed.");

      // Save category assignments if categories changed
      if (selectedCategories.length > 0 && json.data?.id) {
        const pid = json.data.id;
        await authFetch(`/api/products/${pid}/categories`, {
          method: "PUT",
          body: JSON.stringify({ categoryIds: selectedCategories }),
        }).catch(() => {}); // non-blocking — table may not exist yet
      }

      return json.data;
    },
    onSuccess: (data) => {
      setSuccess(true);
      setError(null);
      setTimeout(() => setSuccess(false), 3000);
      qc.invalidateQueries({ queryKey: ["products"] });
      if (isNew && data?.id && typeof window !== "undefined")
        window.location.href = `/admin/products/${data.id}`;
    },
    onError: (err) => setError(err.message),
  });

  const handleImageUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Use Uploadcare for direct upload
      if (UPLOADCARE_KEY) {
        const fd = new FormData();
        fd.append("UPLOADCARE_PUB_KEY", UPLOADCARE_KEY);
        fd.append("UPLOADCARE_STORE", "1");
        fd.append("file", file);
        try {
          const res = await fetch("https://upload.uploadcare.com/base/", {
            method: "POST",
            body: fd,
          });
          const json = await res.json();
          if (json.file) {
            // Request WebP conversion + resizing via Uploadcare CDN transformations
            const cdnUrl = `https://ucarecdn.com/${json.file}/-/format/webp/-/quality/smart/-/resize/800x/`;
            setForm((f) => ({ ...f, image_url: cdnUrl }));
            return;
          }
        } catch (err) {
          console.error("Uploadcare upload failed:", err);
        }
      }

      // Fallback: use platform upload utility
      const reader = new FileReader();
      reader.onload = async () => {
        const { url } = await upload({ url: reader.result });
        if (url) setForm((f) => ({ ...f, image_url: url }));
      };
      reader.readAsDataURL(file);
    },
    [upload],
  );

  const ch = useCallback(
    (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value })),
    [],
  );

  const toggleCategory = useCallback((catId) => {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId],
    );
  }, []);

  if (!isNew && isLoading)
    return <div className="p-8 text-sm text-slate-400">Loading product…</div>;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white">
        <a
          href="/admin/products"
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft size={15} />
        </a>
        <h1 className="text-sm font-semibold text-slate-900 flex-1">
          {isNew ? "New Product" : (product?.name ?? "Edit Product")}
        </h1>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !form.name || !form.sku}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 disabled:opacity-60 transition-colors"
        >
          {mutation.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Save size={12} />
          )}
          {isNew ? "Create" : "Save Changes"}
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-4xl">
          {/* Left: main fields */}
          <div className="lg:col-span-2 space-y-4">
            {(error || success) && (
              <div
                className={`flex items-center gap-2 text-xs rounded px-3 py-2 border ${success ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-500 bg-red-50 border-red-200"}`}
              >
                {success ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <AlertCircle size={13} />
                )}
                {success ? "Saved successfully." : error}
              </div>
            )}

            {/* Basic info */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                Product Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Name *
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={ch}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    SKU *
                  </label>
                  <input
                    name="sku"
                    value={form.sku}
                    onChange={ch}
                    className={inputCls + " font-mono"}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={ch}
                    className={inputCls}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Price *
                  </label>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={ch}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Currency
                  </label>
                  <select
                    name="currency"
                    value={form.currency}
                    onChange={ch}
                    className={inputCls}
                  >
                    <option value="BDT">BDT (৳)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Stock Quantity
                  </label>
                  <input
                    name="stockQuantity"
                    type="number"
                    min="0"
                    value={form.stockQuantity}
                    onChange={ch}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] text-slate-500 font-medium block mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={ch}
                    rows={4}
                    className={inputCls + " resize-none"}
                  />
                </div>
              </div>
            </div>

            {/* Dynamic attributes */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                Attributes & Variants
              </h3>
              <AttrEditor attrs={attrs} onChange={setAttrs} />
            </div>

            {/* Categories */}
            {allCategories.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={13} className="text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Categories
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium transition-colors cursor-pointer ${isSelected ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Click to toggle category assignment.
                </p>
              </div>
            )}
          </div>

          {/* Right: image */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                Product Image
              </h3>
              {form.image_url ? (
                <div className="relative mb-3">
                  <img
                    src={form.image_url}
                    alt="Product"
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-square object-contain border border-slate-200 rounded-lg bg-slate-50"
                  />
                  <button
                    onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-full aspect-square border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center mb-3 gap-2">
                  <Package size={32} className="text-slate-200" />
                  <p className="text-xs text-slate-400">No image yet</p>
                </div>
              )}
              <label className="w-full inline-flex items-center justify-center gap-1.5 cursor-pointer px-3 py-2 rounded border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Upload size={12} />
                {uploading ? "Uploading…" : "Upload Image"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="sr-only"
                />
              </label>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                PNG, JPG, WEBP · Served as WebP via CDN
              </p>
              <div className="mt-3">
                <label className="text-[11px] text-slate-500 font-medium block mb-1">
                  Or paste URL
                </label>
                <input
                  value={form.image_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, image_url: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="https://…"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
