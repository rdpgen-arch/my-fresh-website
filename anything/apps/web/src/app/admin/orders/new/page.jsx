/**
 * Admin: Create New Order (Manual / Phone Order)
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  Package,
  User,
  Truck,
  CreditCard,
} from "lucide-react";
import { authFetch } from "@/utils/authFetch";
import { DISTRICTS } from "@/data/bangladesh";

const inputCls =
  "w-full px-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors";
const labelCls =
  "block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1";

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg mb-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
        <Icon size={13} className="text-slate-400" />
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}

export default function NewOrderPage() {
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    line1: "",
    line2: "",
    district: "",
    upazila: "",
    postalCode: "",
    paymentMethod: "cod",
    notes: "",
  });
  const [shippingZoneId, setShippingZoneId] = useState("");
  const [lineItems, setLineItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [error, setError] = useState(null);

  const ch = useCallback(
    (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value })),
    [],
  );

  // Fetch zones
  const { data: zones = [] } = useQuery({
    queryKey: ["admin-shipping-zones"],
    queryFn: async () => {
      const res = await authFetch("/api/orders/shipping-zones");
      return (await res.json()).data ?? [];
    },
    staleTime: 60000,
  });

  // Product search
  const { data: productResults = [] } = useQuery({
    queryKey: ["product-search-admin", productSearch],
    queryFn: async () => {
      if (productSearch.length < 2) return [];
      const res = await authFetch(
        `/api/products?search=${encodeURIComponent(productSearch)}&status=published&limit=10`,
      );
      return (await res.json()).data ?? [];
    },
    staleTime: 10000,
  });

  const addProduct = useCallback((product) => {
    setLineItems((prev) => {
      const exists = prev.find((i) => i.productId === product.id);
      if (exists)
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unitPrice: Number(product.price),
          quantity: 1,
          currency: product.currency,
        },
      ];
    });
    setProductSearch("");
  }, []);

  const removeItem = useCallback(
    (productId) =>
      setLineItems((prev) => prev.filter((i) => i.productId !== productId)),
    [],
  );

  const updateQty = useCallback(
    (productId, qty) => {
      if (qty < 1) return removeItem(productId);
      setLineItems((prev) =>
        prev.map((i) =>
          i.productId === productId ? { ...i, quantity: qty } : i,
        ),
      );
    },
    [removeItem],
  );

  const subtotal = useMemo(
    () => lineItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [lineItems],
  );
  const selectedZone = zones.find((z) => z.id === shippingZoneId);
  const shipping = selectedZone ? Number(selectedZone.delivery_charge) : 0;
  const grandTotal = subtotal + shipping;
  const currency = lineItems[0]?.currency ?? "BDT";
  const sym = currency === "BDT" ? "৳" : "$";
  const fmt = (n) => `${sym}${Number(n).toLocaleString("en-BD")}`;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          customerEmail: form.customerEmail.trim() || null,
          customerAddress: {
            line1: form.line1.trim(),
            line2: form.line2.trim() || undefined,
            district: form.district.trim(),
            upazila: form.upazila.trim() || undefined,
            postal_code: form.postalCode.trim() || undefined,
            country: "Bangladesh",
          },
          shippingZoneId: shippingZoneId || null,
          paymentMethod: form.paymentMethod,
          currency,
          notes: form.notes.trim() || null,
          source: "admin",
          items: lineItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            selectedAttributes: {},
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create order.");
      return json.data;
    },
    onSuccess: (data) => {
      if (typeof window !== "undefined") {
        window.location.href = `/admin/orders/${data.id}`;
      }
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!form.customerName.trim())
      return setError("Customer name is required.");
    if (!form.customerPhone.trim()) return setError("Phone is required.");
    if (!lineItems.length) return setError("Add at least one product.");
    mutation.mutate();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white">
        <a
          href="/admin/orders"
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft size={15} />
        </a>
        <h1 className="text-sm font-semibold text-slate-900 flex-1">
          New Order
        </h1>
        <button
          onClick={handleSubmit}
          disabled={
            mutation.isPending ||
            !lineItems.length ||
            !form.customerName ||
            !form.customerPhone
          }
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 disabled:opacity-60 transition-colors"
        >
          {mutation.isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <CheckCircle2 size={12} />
          )}
          Place Order
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5">
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">
            <AlertCircle size={12} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-5xl">
          <div className="lg:col-span-2 space-y-4">
            {/* Products */}
            <Section icon={Package} title="Products">
              {/* Search */}
              <div className="relative mb-3">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by name or SKU…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:bg-white transition-colors"
                />
                {productResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                    {productResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addProduct(p)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-medium text-slate-800">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {p.sku}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-900">
                            {sym}
                            {Number(p.price).toLocaleString("en-BD")}
                          </p>
                          <p
                            className={`text-[10px] ${p.stock_quantity === 0 ? "text-red-500" : "text-slate-400"}`}
                          >
                            Stock: {p.stock_quantity}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Line items */}
              {lineItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No items yet. Search and add products above.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {lineItems.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {item.sku}
                        </p>
                      </div>
                      <div className="flex items-center border border-slate-200 rounded overflow-hidden">
                        <button
                          onClick={() =>
                            updateQty(item.productId, item.quantity - 1)
                          }
                          className="px-2 py-1 text-slate-500 hover:bg-slate-50 transition-colors text-xs"
                        >
                          −
                        </button>
                        <span className="px-2 text-xs font-semibold text-slate-800 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQty(item.productId, item.quantity + 1)
                          }
                          className="px-2 py-1 text-slate-500 hover:bg-slate-50 transition-colors text-xs"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs font-semibold text-slate-900 tabular-nums w-20 text-right">
                        {fmt(item.unitPrice * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <div className="pt-3 space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{fmt(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Shipping</span>
                      <span className="tabular-nums">
                        {shippingZoneId ? fmt(shipping) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                      <span>Total</span>
                      <span className="tabular-nums">{fmt(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </Section>

            {/* Customer */}
            <Section icon={User} title="Customer Information">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Full Name *</label>
                  <input
                    name="customerName"
                    value={form.customerName}
                    onChange={ch}
                    className={inputCls}
                    placeholder="Mohammed Rahman"
                  />
                </div>
                <div>
                  <label className={labelCls}>Phone *</label>
                  <input
                    name="customerPhone"
                    value={form.customerPhone}
                    onChange={ch}
                    className={inputCls}
                    placeholder="01XXXXXXXXX"
                    type="tel"
                  />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    name="customerEmail"
                    value={form.customerEmail}
                    onChange={ch}
                    className={inputCls}
                    placeholder="Optional"
                    type="email"
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Address Line 1</label>
                  <input
                    name="line1"
                    value={form.line1}
                    onChange={ch}
                    className={inputCls}
                    placeholder="House, road"
                  />
                </div>
                <div>
                  <label className={labelCls}>District</label>
                  <select
                    name="district"
                    value={form.district}
                    onChange={ch}
                    className={inputCls}
                  >
                    <option value="">Select…</option>
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Postal Code</label>
                  <input
                    name="postalCode"
                    value={form.postalCode}
                    onChange={ch}
                    className={inputCls}
                    placeholder="1207"
                  />
                </div>
              </div>
            </Section>
          </div>

          <div className="space-y-4">
            {/* Shipping Zone */}
            <Section icon={Truck} title="Shipping Zone">
              {zones.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No zones configured.{" "}
                  <a href="/admin/store" className="underline">
                    Configure in Store settings.
                  </a>
                </p>
              ) : (
                <div className="space-y-1.5">
                  {zones.map((zone) => (
                    <label
                      key={zone.id}
                      className={`flex items-center justify-between p-2.5 rounded border cursor-pointer transition-colors ${shippingZoneId === zone.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"}`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="zone"
                          value={zone.id}
                          checked={shippingZoneId === zone.id}
                          onChange={() => setShippingZoneId(zone.id)}
                          className="accent-slate-900"
                        />
                        <div>
                          <p className="text-xs font-medium text-slate-800">
                            {zone.name}
                          </p>
                          {zone.estimated_days && (
                            <p className="text-[10px] text-slate-400">
                              {zone.estimated_days}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-900 tabular-nums">
                        {sym}
                        {Number(zone.delivery_charge).toLocaleString("en-BD")}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </Section>

            {/* Payment */}
            <Section icon={CreditCard} title="Payment Method">
              <div className="space-y-1.5">
                {[
                  { id: "cod", label: "Cash on Delivery" },
                  { id: "bkash", label: "bKash" },
                  { id: "nagad", label: "Nagad" },
                  { id: "manual", label: "Manual / Bank Transfer" },
                ].map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-slate-50 transition-colors border-slate-200"
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={m.id}
                      checked={form.paymentMethod === m.id}
                      onChange={ch}
                      className="accent-slate-900"
                    />
                    <span className="text-xs text-slate-700">{m.label}</span>
                  </label>
                ))}
              </div>
            </Section>

            {/* Notes */}
            <Section icon={Package} title="Internal Notes">
              <textarea
                name="notes"
                value={form.notes}
                onChange={ch}
                rows={3}
                placeholder="Staff notes, delivery instructions…"
                className={inputCls + " resize-none"}
              />
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
