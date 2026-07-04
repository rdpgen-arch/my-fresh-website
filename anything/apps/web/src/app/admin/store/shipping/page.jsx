/**
 * Admin: Shipping Zones Management
 */

"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import {
  Plus,
  Trash2,
  Save,
  Truck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
} from "lucide-react";

const inputCls =
  "w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors";
const EMPTY = {
  name: "",
  code: "",
  deliveryCharge: "",
  estimatedDays: "",
  sortOrder: "0",
};

export default function ShippingZonesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [editId, setEditId] = useState(null);

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ["admin-shipping-zones"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/shipping-zones");
      return (await res.json()).data ?? [];
    },
  });

  const ch = useCallback(
    (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value })),
    [],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name.trim(),
        code: form.code.trim(),
        deliveryCharge: Number(form.deliveryCharge),
        estimatedDays: form.estimatedDays.trim() || null,
        sortOrder: Number(form.sortOrder),
      };
      const res = await authFetch(
        editId
          ? `/api/admin/shipping-zones/${editId}`
          : "/api/admin/shipping-zones",
        { method: editId ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed.");
      return json.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-shipping-zones"] });
      setForm(EMPTY);
      setShowForm(false);
      setEditId(null);
      setFormError(null);
    },
    onError: (err) => setFormError(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      const res = await authFetch(`/api/admin/shipping-zones/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Toggle failed.");
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-shipping-zones"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await authFetch(`/api/admin/shipping-zones/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed.");
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin-shipping-zones"] }),
  });

  const startEdit = (zone) => {
    setForm({
      name: zone.name,
      code: zone.code,
      deliveryCharge: String(zone.delivery_charge),
      estimatedDays: zone.estimated_days ?? "",
      sortOrder: String(zone.sort_order),
    });
    setEditId(zone.id);
    setShowForm(true);
    setFormError(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <a
            href="/admin/store"
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft size={15} />
          </a>
          <div>
            <h1 className="text-sm font-semibold text-slate-900">
              Shipping Zones
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {zones.length} zone{zones.length !== 1 ? "s" : ""} configured
            </p>
          </div>
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
          <Plus size={12} /> Add Zone
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-slate-700 mb-3">
            {editId ? "Edit Zone" : "New Shipping Zone"}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                Zone Name *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={ch}
                placeholder="Inside Dhaka"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                Code *
              </label>
              <input
                name="code"
                value={form.code}
                onChange={ch}
                placeholder="INSIDE_DHAKA"
                className={inputCls + " font-mono uppercase"}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                Delivery Charge (৳)
              </label>
              <input
                name="deliveryCharge"
                value={form.deliveryCharge}
                onChange={ch}
                type="number"
                min="0"
                placeholder="60"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                Estimated Days
              </label>
              <input
                name="estimatedDays"
                value={form.estimatedDays}
                onChange={ch}
                placeholder="1–2 business days"
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
                placeholder="0"
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
              disabled={saveMutation.isPending || !form.name || !form.code}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 disabled:opacity-60 transition-colors"
            >
              {saveMutation.isPending ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Save size={11} />
              )}
              {editId ? "Save Changes" : "Create Zone"}
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
          <div className="p-8 text-sm text-slate-400 text-center">
            Loading zones…
          </div>
        ) : zones.length === 0 ? (
          <div className="text-center py-20">
            <Truck size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">
              No shipping zones yet
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Add your first zone to enable checkout delivery options.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
              <tr>
                {[
                  "Name",
                  "Code",
                  "Charge",
                  "Est. Delivery",
                  "Order",
                  "Status",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zones.map((z) => (
                <tr
                  key={z.id}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {z.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {z.code}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900 tabular-nums">
                    ৳{Number(z.delivery_charge).toLocaleString("en-BD")}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {z.estimated_days ?? (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                    {z.sort_order}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: z.id,
                          isActive: z.is_active,
                        })
                      }
                      className="flex items-center gap-1.5 text-xs"
                    >
                      {z.is_active ? (
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
                        onClick={() => startEdit(z)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this zone?"))
                            deleteMutation.mutate(z.id);
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
