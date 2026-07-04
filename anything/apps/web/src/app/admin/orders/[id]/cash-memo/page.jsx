/**
 * Cash Memo / Invoice Page — /admin/orders/:id/cash-memo
 * Task 5A: Printable cash memo for COD deliveries.
 *
 * - Print-friendly layout (hides UI chrome on print via CSS)
 * - Shows store name, order details, itemized list, totals
 * - WhatsApp share button for easy sharing with rider
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/utils/authFetch";
import { Loader2, Printer, Share2, ArrowLeft } from "lucide-react";

function fmt(n, cur = "BDT") {
  const sym = cur === "BDT" ? "৳" : "$";
  return `${sym}${Number(n).toLocaleString("en-BD")}`;
}

export default function CashMemoPage({ params }) {
  const { id } = params;

  const { data, isLoading, error } = useQuery({
    queryKey: ["order-memo", id],
    queryFn: async () => {
      const res = await authFetch(`/api/orders/${id}`);
      if (!res.ok) throw new Error("Order not found");
      const json = await res.json();
      return json.data;
    },
  });

  // Store info loaded separately
  const { data: storeData } = useQuery({
    queryKey: ["admin-store-meta"],
    queryFn: async () => {
      const res = await authFetch("/api/admin/store");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  if (error || !data)
    return (
      <div className="p-8 text-red-600 text-sm">Could not load order.</div>
    );

  const order = data;
  const addr = order.customer_address ?? {};
  const storeName = storeData?.name ?? "Store";
  const storePhone = storeData?.contact_phone ?? "";

  const handlePrint = () => window.print();

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `*CASH MEMO*\n` +
        `Store: ${storeName}\n` +
        `Order: ${order.order_number}\n` +
        `Customer: ${order.customer_name}\n` +
        `Phone: ${order.customer_phone}\n` +
        `Address: ${addr.line1 ?? ""}, ${addr.district ?? ""}\n` +
        `Total: ${fmt(order.grand_total, order.currency)}\n` +
        `Payment: ${order.payment_method?.toUpperCase()}`,
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .memo-card { box-shadow: none; border: none; max-width: 100%; }
        }
        @page { size: A5; margin: 10mm; }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white">
        <a
          href={`/admin/orders/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={14} /> Back
        </a>
        <div className="flex-1" />
        <button
          onClick={handleWhatsApp}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
        >
          <Share2 size={14} /> WhatsApp
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900 text-white text-sm hover:bg-slate-700"
        >
          <Printer size={14} /> Print Memo
        </button>
      </div>

      {/* Memo card */}
      <div className="p-6 max-w-lg mx-auto">
        <div className="memo-card bg-white border border-slate-200 rounded p-6 text-sm">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
            <h1 className="text-xl font-bold text-slate-900">{storeName}</h1>
            {storePhone && (
              <p className="text-xs text-slate-500 mt-1">📞 {storePhone}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-2 uppercase tracking-widest">
              Cash Memo / Delivery Slip
            </p>
          </div>

          {/* Order meta */}
          <div className="grid grid-cols-2 gap-1 text-xs mb-4">
            <span className="text-slate-500">Order No.</span>
            <span className="font-bold text-slate-900">
              {order.order_number}
            </span>
            <span className="text-slate-500">Date</span>
            <span className="text-slate-700">
              {new Date(order.created_at).toLocaleDateString("en-BD", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="text-slate-500">Payment</span>
            <span className="text-slate-700 uppercase">
              {order.payment_method}
            </span>
            <span className="text-slate-500">Status</span>
            <span className="capitalize font-medium text-slate-700">
              {order.status}
            </span>
          </div>

          {/* Customer */}
          <div className="border border-slate-100 rounded p-3 mb-4 bg-slate-50">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1">
              Deliver To
            </p>
            <p className="font-bold text-slate-900">{order.customer_name}</p>
            <p className="text-slate-600">{order.customer_phone}</p>
            <p className="text-slate-600 text-xs mt-0.5">
              {[
                addr.line1,
                addr.line2,
                addr.district,
                addr.postal_code,
                "Bangladesh",
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>

          {/* Items table */}
          <table className="w-full text-xs mb-4">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="text-left pb-1.5 font-semibold">Item</th>
                <th className="text-center pb-1.5 font-semibold w-10">Qty</th>
                <th className="text-right pb-1.5 font-semibold">Price</th>
                <th className="text-right pb-1.5 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items ?? []).map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2 text-slate-800">{item.name}</td>
                  <td className="text-center text-slate-600">
                    {item.quantity}
                  </td>
                  <td className="text-right text-slate-600">
                    {fmt(item.unit_price, order.currency)}
                  </td>
                  <td className="text-right font-medium text-slate-800">
                    {fmt(item.line_total, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="space-y-1 text-xs border-t border-dashed border-slate-300 pt-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{fmt(order.subtotal, order.currency)}</span>
            </div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>−{fmt(order.discount_amount, order.currency)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Delivery</span>
              <span>{fmt(order.shipping_total, order.currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-slate-900 pt-1 border-t border-slate-200">
              <span>Grand Total</span>
              <span>{fmt(order.grand_total, order.currency)}</span>
            </div>
            {/* Task 5A: COD exact amount validation field */}
            {order.payment_method === "cod" && (
              <div className="flex justify-between text-slate-500 pt-1">
                <span>Collected by Rider</span>
                <span className="font-bold text-slate-900">
                  {order.cod_exact_amount
                    ? fmt(order.cod_exact_amount, order.currency)
                    : "৳ __________"}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] text-slate-400 mt-4 pt-3 border-t border-dashed border-slate-200">
            Thank you for your order! For queries: {storePhone || storeName}
          </div>
        </div>
      </div>
    </>
  );
}
