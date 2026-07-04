/**
 * Admin: Product Categories Management
 */

"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import {
  Plus,
  Trash2,
  Save,
  Tag,
  AlertCircle,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Pencil,
} from "lucide-react";

const inputCls =
  "w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors";
const EMPTY = { name: "", slug: "", description: "", sortOrder: "0" };

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [editId, setEditId] = useState(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/categories");
      if (!res.ok) return [];
      return (await res.json()).data ?? [];
    },
  });

  const ch = useCallback(
    (e) => {
      const { name, value } = e.target;
      setForm((f) => {
        const next = { ...f, [name]: value };
        if (name === "name" && !editId) next.slug = slugify(value);
        return next;
      });
    },
    [editId],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        sortOrder: Number(form.sortOrder),
      };
      const res = await authFetch(
        editId ? `/api/admin/categories/${editId}` : "/api/admin/categories",
        { method: editId ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed.");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      setForm(EMPTY);
      setShowForm(false);
      setEditId(null);
      setFormError(null);
    },
    onError: (err) => setFormError(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      const res = await authFetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Toggle failed.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await authFetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const startEdit = (cat) => {
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
      sortOrder: String(cat.sort_order),
    });
    setEditId(cat.id);
    setShowForm(true);
    setFormError(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div>
          <h1 className="text-sm font-semibold text-slate-900">Categories</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {categories.length} category{categories.length !== 1 ? "ies" : "y"}
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setEditId(null);
            setForm(EMPTY);
            setFormError(null);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 transition-colors"
        >
          <Plus size={12} /> Add Category
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-slate-700 mb-3">
            {editId ? "Edit Category" : "New Category"}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                Name *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={ch}
                placeholder="Men's Fashion"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                Slug *
              </label>
              <input
                name="slug"
                value={form.slug}
                onChange={ch}
                placeholder="mens-fashion"
                className={inputCls + " font-mono"}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                Description
              </label>
              <input
                name="description"
                value={form.description}
                onChange={ch}
                placeholder="Optional"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                Sort Order
              </label>
              <input
                name="sortOrder"
                value={form.sortOrder}
                onChange={ch}
                type="number"
                min="0"
                className={inputCls}
              />
            </div>
          </div>
          {formError && (
            <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
              <AlertCircle size={11} />
              {formError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.name || !form.slug}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 disabled:opacity-60 transition-colors"
            >
              {saveMutation.isPending ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Save size={11} />
              )}
              {editId ? "Save" : "Create"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setEditId(null);
                setForm(EMPTY);
              }}
              className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-sm text-slate-400 text-center">Loading…</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20">
            <Tag size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">
              No categories yet
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Create categories to organize your products.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr>
                {["Name", "Slug", "Description", "Sort", "Status", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((cat) => (
                <tr
                  key={cat.id}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {cat.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {cat.slug}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                    {cat.description ?? (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                    {cat.sort_order}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: cat.id,
                          isActive: cat.is_active,
                        })
                      }
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {cat.is_active ? (
                        <>
                          <ToggleRight size={18} className="text-emerald-600" />
                          <span className="text-emerald-700 font-medium">
                            Active
                          </span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft size={18} className="text-slate-400" />
                          <span className="text-slate-500">Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(cat)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${cat.name}"?`))
                            deleteMutation.mutate(cat.id);
                        }}
                        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
