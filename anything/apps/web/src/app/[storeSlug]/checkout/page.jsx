"use client";
/**
 * Checkout Page — Redesigned
 * Bengali CTAs · Single page · Mobile first · No login required
 */
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  Loader2,
  AlertCircle,
  Package,
  Truck,
  CreditCard,
  ChevronDown,
  ChevronUp,
  MapPin,
  Check,
} from "lucide-react";
import { useCartStore } from "@/utils/cartStore";
import { useStore } from "../layout";
import { useAnalytics } from "@/utils/useAnalytics";
import { DISTRICTS, getUpazilas } from "@/data/bangladesh";
import { CouponBox } from "./components/CouponBox";
import { OrderNoteField } from "./components/OrderNoteField";

const fmt = (n, cur = "BDT") =>
  `${cur === "BDT" ? "৳" : "$"}${Number(n).toLocaleString("en-BD")}`;

const iStyle = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "10px",
  fontSize: "15px",
  color: "#111827",
  outline: "none",
  fontFamily: "inherit",
  background: "#fff",
  boxSizing: "border-box",
  transition: "border-color 120ms",
};
const onF = (e) => {
  e.target.style.borderColor = "var(--accent, #5B21B6)";
};
const onBl = (e) => {
  e.target.style.borderColor = "#e5e7eb";
};

function Label({ children, required }) {
  return (
    <label
      style={{
        fontSize: "13px",
        fontWeight: "600",
        color: "#374151",
        display: "block",
        marginBottom: "5px",
      }}
    >
      {children}
      {required && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
  );
}

// ─── Cart Panel ───────────────────────────────────────────────────────────────

function CartPanel({
  items,
  setQuantity,
  removeItem,
  subtotal,
  shipping,
  currency,
  couponDiscount,
  couponCode,
}) {
  const [open, setOpen] = useState(true);
  const grand = subtotal + shipping - couponDiscount;

  if (items.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "40px 20px",
          background: "#fff",
          borderRadius: "14px",
          border: "1.5px solid #e5e7eb",
        }}
      >
        <ShoppingCart
          size={40}
          style={{ color: "#d1d5db", margin: "0 auto 14px", display: "block" }}
        />
        <p
          style={{
            fontSize: "16px",
            fontWeight: "600",
            color: "#111827",
            marginBottom: "6px",
          }}
        >
          কার্ট খালি
        </p>
        <a
          href="javascript:history.back()"
          style={{
            fontSize: "14px",
            color: "var(--accent, #5B21B6)",
            textDecoration: "none",
            fontWeight: "600",
          }}
        >
          ← কেনাকাটা চালিয়ে যান
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "14px",
        border: "1.5px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 18px",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "15px", fontWeight: "700", color: "#111827" }}>
          আপনার কার্ট ({items.reduce((s, i) => s + i.quantity, 0)} টি পণ্য)
        </span>
        {open ? (
          <ChevronUp size={16} style={{ color: "#6b7280" }} />
        ) : (
          <ChevronDown size={16} style={{ color: "#6b7280" }} />
        )}
      </button>

      {open && (
        <>
          <div style={{ borderTop: "1px solid #e5e7eb" }}>
            {items.map((item, i) => {
              const attrs = Object.entries(
                item.selectedAttributes ?? {},
              ).filter(([, v]) => v);
              return (
                <div
                  key={item._key}
                  style={{
                    display: "flex",
                    gap: "12px",
                    padding: "14px 18px",
                    borderBottom:
                      i < items.length - 1 ? "1px solid #f3f4f6" : "none",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      flexShrink: 0,
                      borderRadius: "10px",
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <Package size={20} style={{ color: "#d1d5db" }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#111827",
                        lineHeight: "1.35",
                      }}
                    >
                      {item.name}
                    </p>
                    {attrs.length > 0 && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "2px",
                        }}
                      >
                        {attrs.map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </p>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          border: "1.5px solid #e5e7eb",
                          borderRadius: "8px",
                          overflow: "hidden",
                        }}
                      >
                        <button
                          onClick={() =>
                            setQuantity(item._key, item.quantity - 1)
                          }
                          style={{
                            width: "32px",
                            height: "32px",
                            border: "none",
                            background: "#f9fafb",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#374151",
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <span
                          style={{
                            width: "36px",
                            textAlign: "center",
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "#111827",
                          }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            setQuantity(item._key, item.quantity + 1)
                          }
                          style={{
                            width: "32px",
                            height: "32px",
                            border: "none",
                            background: "#f9fafb",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#374151",
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item._key)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#9ca3af",
                          display: "flex",
                          padding: "4px",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: "700",
                      color: "#111827",
                      flexShrink: 0,
                    }}
                  >
                    {fmt(item.price * item.quantity, currency)}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Totals */}
          <div
            style={{
              padding: "14px 18px",
              background: "#f9fafb",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              <span style={{ fontSize: "13.5px", color: "#6b7280" }}>
                সাবটোটাল
              </span>
              <span
                style={{
                  fontSize: "13.5px",
                  color: "#111827",
                  fontWeight: "600",
                }}
              >
                {fmt(subtotal, currency)}
              </span>
            </div>
            {couponDiscount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontSize: "13.5px", color: "#16a34a" }}>
                  কুপন ({couponCode})
                </span>
                <span
                  style={{
                    fontSize: "13.5px",
                    color: "#16a34a",
                    fontWeight: "600",
                  }}
                >
                  -{fmt(couponDiscount, currency)}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <span style={{ fontSize: "13.5px", color: "#6b7280" }}>
                ডেলিভারি চার্জ
              </span>
              <span
                style={{
                  fontSize: "13.5px",
                  color: "#111827",
                  fontWeight: "600",
                }}
              >
                {shipping === 0 ? "— জোন বেছে নিন" : fmt(shipping, currency)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #e5e7eb",
                paddingTop: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#111827",
                }}
              >
                মোট
              </span>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "var(--accent, #5B21B6)",
                }}
              >
                {fmt(grand, currency)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function FormSection({ number, title, children }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "14px",
        border: "1.5px solid #e5e7eb",
        overflow: "hidden",
        marginBottom: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "14px 18px",
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            background: "var(--accent, #5B21B6)",
            color: "#fff",
            fontSize: "12px",
            fontWeight: "800",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {number}
        </div>
        <span style={{ fontSize: "15px", fontWeight: "700", color: "#111827" }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "18px" }}>{children}</div>
    </div>
  );
}

// ─── Payment logos ────────────────────────────────────────────────────────────

function PaymentLogos() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "8px",
        marginTop: "12px",
        flexWrap: "wrap",
      }}
    >
      {["bKash", "Nagad", "COD", "SSL"].map((p) => (
        <span
          key={p}
          style={{
            fontSize: "11.5px",
            fontWeight: "600",
            color: "#374151",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            padding: "3px 8px",
          }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage({ params }) {
  const { storeSlug } = params;
  const storeConfig = useStore();
  const analytics = useAnalytics(storeSlug);

  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    addressLine1: "",
    district: "",
    upazila: "",
  });
  const [zoneId, setZoneId] = useState("");
  const [payment, setPayment] = useState("cod");
  const [formError, setFormError] = useState(null);
  const [coupon, setCoupon] = useState(null);
  const [orderNote, setOrderNote] = useState("");

  const upazilas = useMemo(() => getUpazilas(form.district), [form.district]);
  const sessionKey = useRef(
    typeof window !== "undefined"
      ? (localStorage.getItem("ac_session") ??
          (() => {
            const k = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            localStorage.setItem("ac_session", k);
            return k;
          })())
      : "ssr",
  );

  const captureAbandonedCart = useCallback(() => {
    if (!items.length) return;
    fetch(`/api/storefront/${storeSlug}/abandoned-cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionKey: sessionKey.current,
        customerName: form.customerName || null,
        customerPhone: form.customerPhone || null,
        customerEmail: form.customerEmail || null,
        cartItems: items.map((i) => ({
          id: i.id,
          sku: i.sku,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        cartTotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
        currency: items[0]?.currency ?? "BDT",
        sourceUrl: typeof window !== "undefined" ? window.location.href : "",
      }),
    }).catch(() => {});
  }, [form, items, storeSlug]);

  useEffect(() => {
    const fn = () => captureAbandonedCart();
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [captureAbandonedCart]);

  const begunCheckout = useRef(false);
  useEffect(() => {
    if (!begunCheckout.current && items.length > 0) {
      begunCheckout.current = true;
      const st = items.reduce((s, i) => s + i.price * i.quantity, 0);
      if (analytics?.trackBeginCheckout)
        analytics.trackBeginCheckout(items, st, items[0]?.currency ?? "BDT");
    }
  }, [items, analytics]);

  const set = (k) => (e) => {
    setForm((f) => ({
      ...f,
      [k]: e.target.value,
      ...(k === "district" ? { upazila: "" } : {}),
    }));
    setFormError(null);
  };

  const { data: zones = [] } = useQuery({
    queryKey: ["sf-zones", storeSlug],
    queryFn: async () => {
      const res = await fetch(`/api/storefront/${storeSlug}/shipping-zones`);
      const json = await res.json();
      return json.data ?? [];
    },
    staleTime: 600000,
  });

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items],
  );
  const couponDiscount = coupon?.discountAmount ?? 0;
  const selectedZone = zones.find((z) => z.id === zoneId);
  const shipping = selectedZone ? Number(selectedZone.delivery_charge) : 0;
  const grand = subtotal - couponDiscount + shipping;
  const currency = items[0]?.currency ?? "BDT";

  const paymentMethods = useMemo(() => {
    const methods = [
      { id: "cod", label: "💵 ক্যাশ অন ডেলিভারি", desc: "পণ্য পেলে পেমেন্ট করুন" },
    ];
    const gws = storeConfig?.paymentMethods ?? [];
    gws.forEach((g) => {
      if (g.id === "bkash")
        methods.push({
          id: "bkash",
          label: "🟡 bKash",
          desc: "বিকাশে পেমেন্ট করুন",
        });
      if (g.id === "nagad")
        methods.push({
          id: "nagad",
          label: "🟠 Nagad",
          desc: "নগদে পেমেন্ট করুন",
        });
      if (g.id === "sslcommerz")
        methods.push({
          id: "sslcommerz",
          label: "💳 কার্ড / SSLCommerz",
          desc: "যেকোনো কার্ডে পেমেন্ট",
        });
    });
    return methods;
  }, [storeConfig]);

  const orderMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/storefront/${storeSlug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          customerEmail: form.customerEmail.trim() || null,
          customerAddress: {
            line1: form.addressLine1.trim(),
            district: form.district,
            upazila: form.upazila || undefined,
            country: "Bangladesh",
          },
          shippingZoneId: zoneId || null,
          paymentMethod: payment,
          couponCode: coupon?.code ?? null,
          notes: orderNote.trim() || null,
          items: items.map((i) => ({
            productId: i.id,
            quantity: i.quantity,
            selectedAttributes: i.selectedAttributes,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Checkout failed.");
      return json;
    },
    onSuccess: (data) => {
      try {
        sessionStorage.setItem(
          `order_${data.orderNumber}`,
          JSON.stringify({
            orderNumber: data.orderNumber,
            grandTotal: grand,
            subtotal,
            couponDiscount,
            shippingCharge: shipping,
            currency,
            paymentMethod: payment,
            items: items.map((i) => ({
              id: i.id,
              name: i.name,
              price: i.price,
              quantity: i.quantity,
              imageUrl: i.image_url ?? null,
              selectedAttributes: i.selectedAttributes,
            })),
            shippingZoneName: selectedZone?.name ?? null,
            estimatedDays: selectedZone?.estimated_days ?? null,
            customerName: form.customerName,
            customerPhone: form.customerPhone,
          }),
        );
      } catch (_) {}
      clearCart();
      if (data.paymentType === "gateway" && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      window.location.href = `/${storeSlug}/order/${data.orderNumber}`;
      if (analytics?.trackPurchase)
        analytics.trackPurchase({
          order_number: data.orderNumber,
          grand_total: grand,
          items,
          payment_method: payment,
          currency,
        });
    },
    onError: (err) => setFormError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.customerName.trim()) return setFormError("নাম দিন।");
    if (!form.customerPhone.trim()) return setFormError("মোবাইল নম্বর দিন।");
    if (!form.addressLine1.trim()) return setFormError("ঠিকানা দিন।");
    if (!form.district) return setFormError("জেলা বেছে নিন।");
    if (!zoneId) return setFormError("ডেলিভারি এরিয়া বেছে নিন।");
    if (!items.length) return setFormError("কার্ট খালি।");
    orderMut.mutate();
  };

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px 16px 80px",
      }}
    >
      <h1
        style={{
          fontSize: "22px",
          fontWeight: "800",
          color: "#111827",
          marginBottom: "20px",
          letterSpacing: "-0.02em",
        }}
      >
        অর্ডার করুন
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 400px",
          gap: "24px",
          alignItems: "start",
        }}
        className="co-grid"
      >
        {/* Left: Form */}
        <form onSubmit={handleSubmit}>
          <FormSection number="1" title="আপনার তথ্য">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
              className="form-2col"
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <Label required>পুরো নাম</Label>
                <input
                  style={iStyle}
                  name="customerName"
                  value={form.customerName}
                  onChange={set("customerName")}
                  placeholder="আপনার নাম লিখুন"
                  onFocus={onF}
                  onBlur={onBl}
                />
              </div>
              <div>
                <Label required>মোবাইল নম্বর</Label>
                <input
                  style={iStyle}
                  type="tel"
                  name="customerPhone"
                  value={form.customerPhone}
                  onChange={set("customerPhone")}
                  placeholder="01XXXXXXXXX"
                  onFocus={onF}
                  onBlur={onBl}
                />
              </div>
              <div>
                <Label>ইমেইল (optional)</Label>
                <input
                  style={iStyle}
                  type="email"
                  name="customerEmail"
                  value={form.customerEmail}
                  onChange={set("customerEmail")}
                  placeholder="you@example.com"
                  onFocus={onF}
                  onBlur={onBl}
                />
              </div>
            </div>
          </FormSection>

          <FormSection number="2" title="ডেলিভারি ঠিকানা">
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div>
                <Label required>বিস্তারিত ঠিকানা</Label>
                <input
                  style={iStyle}
                  name="addressLine1"
                  value={form.addressLine1}
                  onChange={set("addressLine1")}
                  placeholder="বাড়ি/ফ্ল্যাট নম্বর, রাস্তার নাম"
                  onFocus={onF}
                  onBlur={onBl}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <Label required>জেলা</Label>
                  <select
                    style={{ ...iStyle, cursor: "pointer" }}
                    name="district"
                    value={form.district}
                    onChange={set("district")}
                    onFocus={onF}
                    onBlur={onBl}
                  >
                    <option value="">জেলা বেছে নিন…</option>
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>উপজেলা</Label>
                  <select
                    style={{ ...iStyle, cursor: "pointer" }}
                    name="upazila"
                    value={form.upazila}
                    onChange={set("upazila")}
                    onFocus={onF}
                    onBlur={onBl}
                  >
                    <option value="">উপজেলা…</option>
                    {upazilas.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection number="3" title="ডেলিভারি এরিয়া">
            {zones.length === 0 ? (
              <p style={{ fontSize: "13.5px", color: "#6b7280" }}>
                কোনো ডেলিভারি জোন নেই।
              </p>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {zones.map((z) => (
                  <label
                    key={z.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "13px 16px",
                      border: `1.5px solid ${zoneId === z.id ? "var(--accent, #5B21B6)" : "#e5e7eb"}`,
                      borderRadius: "10px",
                      cursor: "pointer",
                      background:
                        zoneId === z.id
                          ? "var(--accent-muted, #EDE9FE)"
                          : "#fff",
                      transition: "all 120ms",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <input
                        type="radio"
                        name="zone"
                        value={z.id}
                        checked={zoneId === z.id}
                        onChange={() => setZoneId(z.id)}
                        style={{
                          accentColor: "var(--accent, #5B21B6)",
                          width: "17px",
                          height: "17px",
                        }}
                      />
                      <div>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#111827",
                          }}
                        >
                          {z.name}
                        </p>
                        {z.estimated_days && (
                          <p style={{ fontSize: "12px", color: "#6b7280" }}>
                            {z.estimated_days}
                          </p>
                        )}
                      </div>
                    </div>
                    <p
                      style={{
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "#111827",
                      }}
                    >
                      {Number(z.delivery_charge) === 0
                        ? "ফ্রি"
                        : fmt(z.delivery_charge, currency)}
                    </p>
                  </label>
                ))}
              </div>
            )}
          </FormSection>

          <FormSection number="4" title="পেমেন্ট পদ্ধতি">
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {paymentMethods.map((m) => (
                <label
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "13px 16px",
                    border: `1.5px solid ${payment === m.id ? "var(--accent, #5B21B6)" : "#e5e7eb"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    background:
                      payment === m.id
                        ? "var(--accent-muted, #EDE9FE)"
                        : "#fff",
                    transition: "all 120ms",
                  }}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={m.id}
                    checked={payment === m.id}
                    onChange={() => setPayment(m.id)}
                    style={{
                      accentColor: "var(--accent, #5B21B6)",
                      width: "17px",
                      height: "17px",
                    }}
                  />
                  <div>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#111827",
                      }}
                    >
                      {m.label}
                    </p>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>
                      {m.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </FormSection>

          {/* Coupon */}
          <div style={{ marginBottom: "14px" }}>
            <CouponBox
              storeSlug={storeSlug}
              subtotal={subtotal}
              onApply={setCoupon}
            />
          </div>
          <div style={{ marginBottom: "14px" }}>
            <OrderNoteField value={orderNote} onChange={setOrderNote} />
          </div>

          {formError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "12px 14px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                color: "#dc2626",
                fontSize: "13.5px",
                marginBottom: "14px",
              }}
            >
              <AlertCircle size={15} /> {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={orderMut.isPending || !items.length}
            style={{
              width: "100%",
              padding: "17px",
              borderRadius: "12px",
              border: "none",
              background: "var(--accent, #5B21B6)",
              color: "#fff",
              fontSize: "17px",
              fontWeight: "800",
              cursor: orderMut.isPending ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              opacity: orderMut.isPending || !items.length ? 0.7 : 1,
              letterSpacing: "-0.01em",
              transition: "opacity 150ms",
            }}
          >
            {orderMut.isPending ? (
              <Loader2
                size={20}
                style={{ animation: "spin 0.75s linear infinite" }}
              />
            ) : null}
            অর্ডার দিন — {fmt(grand, currency)}
          </button>
          <PaymentLogos />
        </form>

        {/* Right: Cart summary */}
        <div style={{ position: "sticky", top: "80px" }}>
          <CartPanel
            items={items}
            setQuantity={setQuantity}
            removeItem={removeItem}
            subtotal={subtotal}
            shipping={shipping}
            currency={currency}
            couponDiscount={couponDiscount}
            couponCode={coupon?.code}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media (max-width: 767px) {
          .co-grid { grid-template-columns: 1fr !important; }
          .form-2col { grid-template-columns: 1fr !important; }
          .form-2col > div { grid-column: 1 / -1 !important; }
        }
      `}</style>
    </div>
  );
}
