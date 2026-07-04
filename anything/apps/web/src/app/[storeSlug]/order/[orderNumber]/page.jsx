"use client";
/**
 * Order Confirmation Page — Redesigned
 * Animated checkmark · Bengali text · WhatsApp share · FB share
 */
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Package,
  Truck,
  CreditCard,
  Share2,
  MapPin,
  Phone,
  Star,
} from "lucide-react";

const fmt = (n, cur = "BDT") =>
  `${cur === "BDT" ? "৳" : "$"}${Number(n).toLocaleString("en-BD")}`;
const PM = {
  cod: "ক্যাশ অন ডেলিভারি",
  bkash: "bKash",
  nagad: "Nagad",
  sslcommerz: "SSLCommerz",
};

export default function OrderConfirmationPage({ params }) {
  const { storeSlug, orderNumber } = params;
  const [order, setOrder] = useState(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setTimeout(() => setAnimated(true), 100);
    try {
      const raw = sessionStorage.getItem(`order_${orderNumber}`);
      if (raw) setOrder(JSON.parse(raw));
    } catch (_) {}
  }, [orderNumber]);

  const shareWhatsApp = () => {
    if (typeof window === "undefined") return;
    const trackUrl = `${window.location.origin}/${storeSlug}/track?order=${orderNumber}&phone=${encodeURIComponent(order?.customerPhone ?? "")}`;
    const text = `✅ অর্ডার সম্পন্ন! অর্ডার #${orderNumber}\nঅর্ডার ট্র্যাক করুন: ${trackUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareFacebook = () => {
    if (typeof window === "undefined") return;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + "/" + storeSlug)}`,
      "_blank",
    );
  };

  return (
    <div
      style={{ maxWidth: "580px", margin: "0 auto", padding: "32px 20px 80px" }}
    >
      {/* Animated checkmark */}
      <div
        style={{
          textAlign: "center",
          padding: "36px 24px",
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
          border: "1.5px solid #bbf7d0",
          borderRadius: "20px",
          marginBottom: "24px",
          transform: animated
            ? "translateY(0) scale(1)"
            : "translateY(20px) scale(0.95)",
          opacity: animated ? 1 : 0,
          transition: "all 450ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 0 0 8px rgba(22,163,74,0.15)",
            transform: animated ? "scale(1)" : "scale(0.4)",
            transition:
              "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms",
          }}
        >
          <CheckCircle2 size={36} color="#fff" strokeWidth={2.5} />
        </div>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: "#14532d",
            letterSpacing: "-0.02em",
            marginBottom: "6px",
          }}
        >
          আপনার অর্ডার নেওয়া হয়েছে! 🎉
        </h1>
        <p
          style={{ fontSize: "14.5px", color: "#166534", marginBottom: "16px" }}
        >
          {order?.customerName
            ? `ধন্যবাদ, ${order.customerName.split(" ")[0]}! আপনার অর্ডার নিশ্চিত হয়েছে।`
            : "আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে।"}
        </p>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 18px",
            background: "#dcfce7",
            borderRadius: "99px",
            border: "1px solid #86efac",
          }}
        >
          <span
            style={{
              fontSize: "11.5px",
              fontWeight: "600",
              color: "#15803d",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            অর্ডার নম্বর
          </span>
          <span
            style={{
              fontSize: "16px",
              fontWeight: "800",
              color: "#14532d",
              fontFamily: "monospace",
            }}
          >
            #{orderNumber}
          </span>
        </div>
      </div>

      {/* COD notice */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
          padding: "14px 16px",
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "12px",
          marginBottom: "20px",
        }}
      >
        <Phone
          size={18}
          style={{ color: "#d97706", flexShrink: 0, marginTop: "2px" }}
        />
        <div>
          <p
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#92400e",
              marginBottom: "3px",
            }}
          >
            কনফার্মেশন কল আসবে শীঘ্রই
          </p>
          <p style={{ fontSize: "13px", color: "#78350f", lineHeight: "1.6" }}>
            আমাদের টিম সংক্ষেপে আপনাকে কল করে অর্ডার কনফার্ম করবে। ফোন রিসিভ করুন।
          </p>
        </div>
      </div>

      {/* Delivery summary */}
      {order && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          {order.shippingZoneName && (
            <div
              style={{
                padding: "14px",
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "6px",
                }}
              >
                <Truck size={13} style={{ color: "#6b7280" }} />
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  ডেলিভারি
                </span>
              </div>
              <p
                style={{
                  fontSize: "13.5px",
                  fontWeight: "600",
                  color: "#111827",
                }}
              >
                {order.shippingZoneName}
              </p>
              {order.estimatedDays && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#6b7280",
                    marginTop: "2px",
                  }}
                >
                  {order.estimatedDays}
                </p>
              )}
            </div>
          )}
          <div
            style={{
              padding: "14px",
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "6px",
              }}
            >
              <CreditCard size={13} style={{ color: "#6b7280" }} />
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                পেমেন্ট
              </span>
            </div>
            <p
              style={{
                fontSize: "13.5px",
                fontWeight: "600",
                color: "#111827",
              }}
            >
              {PM[order.paymentMethod] ?? order.paymentMethod}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "#d97706",
                marginTop: "2px",
                fontWeight: "500",
              }}
            >
              পণ্য পেলে পেমেন্ট
            </p>
          </div>
        </div>
      )}

      {/* Order items */}
      {order?.items?.length > 0 && (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            overflow: "hidden",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <p
              style={{
                fontSize: "13.5px",
                fontWeight: "700",
                color: "#111827",
              }}
            >
              অর্ডারকৃত পণ্য ({order.items.length}টি)
            </p>
          </div>
          {order.items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "12px",
                padding: "12px 16px",
                borderBottom:
                  i < order.items.length - 1 ? "1px solid #f3f4f6" : "none",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  flexShrink: 0,
                  borderRadius: "8px",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Package size={16} style={{ color: "#d1d5db" }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "13.5px",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  {item.name}
                </p>
                <p style={{ fontSize: "12px", color: "#6b7280" }}>
                  সংখ্যা: {item.quantity}
                </p>
              </div>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#111827",
                }}
              >
                {fmt(item.price * item.quantity, order.currency)}
              </span>
            </div>
          ))}
          {/* Totals */}
          <div
            style={{
              padding: "14px 16px",
              background: "#f9fafb",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "5px",
              }}
            >
              <span style={{ fontSize: "13px", color: "#6b7280" }}>সাবটোটাল</span>
              <span style={{ fontSize: "13px", color: "#111827" }}>
                {fmt(order.subtotal, order.currency)}
              </span>
            </div>
            {order.couponDiscount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <span style={{ fontSize: "13px", color: "#16a34a" }}>
                  ডিসকাউন্ট
                </span>
                <span style={{ fontSize: "13px", color: "#16a34a" }}>
                  -{fmt(order.couponDiscount, order.currency)}
                </span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "13px", color: "#6b7280" }}>
                ডেলিভারি
              </span>
              <span style={{ fontSize: "13px", color: "#111827" }}>
                {fmt(order.shippingCharge ?? 0, order.currency)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #e5e7eb",
                paddingTop: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#111827",
                }}
              >
                মোট
              </span>
              <span
                style={{
                  fontSize: "17px",
                  fontWeight: "800",
                  color: "var(--accent, #5B21B6)",
                }}
              >
                {fmt(order.grandTotal, order.currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Status timeline */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "14px",
          padding: "18px",
          marginBottom: "24px",
        }}
      >
        <p
          style={{
            fontSize: "14px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "18px",
          }}
        >
          পরবর্তী কী হবে?
        </p>
        {[
          { label: "অর্ডার কনফার্মড", sub: "আপনার অর্ডার সিস্টেমে আছে", done: true },
          { label: "প্রসেসিং", sub: "আপনার পণ্য তৈরি হচ্ছে", done: false },
          { label: "শিপড", sub: "কুরিয়ারে পাঠানো হবে", done: false },
          { label: "ডেলিভারড", sub: "পণ্য পেয়ে পেমেন্ট করুন", done: false },
        ].map((step, i, arr) => (
          <div
            key={step.label}
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: i < arr.length - 1 ? "14px" : 0,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: step.done ? "#16a34a" : "#f3f4f6",
                  border: `2px solid ${step.done ? "#16a34a" : "#e5e7eb"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: step.done ? "#fff" : "#9ca3af",
                }}
              >
                {step.done ? <CheckCircle2 size={15} /> : i + 1}
              </div>
              {i < arr.length - 1 && (
                <div
                  style={{
                    width: "2px",
                    height: "20px",
                    background: step.done ? "#16a34a" : "#e5e7eb",
                    marginTop: "4px",
                  }}
                />
              )}
            </div>
            <div style={{ paddingTop: "4px" }}>
              <p
                style={{
                  fontSize: "13.5px",
                  fontWeight: "600",
                  color: step.done ? "#111827" : "#6b7280",
                }}
              >
                {step.label}
              </p>
              <p
                style={{ fontSize: "12px", color: "#9ca3af", marginTop: "1px" }}
              >
                {step.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <a
          href={`/${storeSlug}/track?order=${orderNumber}&phone=${encodeURIComponent(order?.customerPhone ?? "")}`}
          style={{
            flex: 1,
            minWidth: "140px",
            padding: "13px 16px",
            borderRadius: "10px",
            background: "var(--accent, #5B21B6)",
            color: "#fff",
            textDecoration: "none",
            textAlign: "center",
            fontSize: "14px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <MapPin size={15} /> অর্ডার ট্র্যাক করুন
        </a>
        <button
          onClick={shareWhatsApp}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "13px 16px",
            borderRadius: "10px",
            background: "#25d366",
            color: "#fff",
            border: "none",
            fontSize: "14px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          <Share2 size={14} /> WhatsApp
        </button>
        <button
          onClick={shareFacebook}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "13px 16px",
            borderRadius: "10px",
            background: "#1877f2",
            color: "#fff",
            border: "none",
            fontSize: "14px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          <Share2 size={14} /> Facebook
        </button>
      </div>
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <a
          href={`/${storeSlug}`}
          style={{
            fontSize: "13.5px",
            color: "var(--accent, #5B21B6)",
            textDecoration: "none",
            fontWeight: "600",
          }}
        >
          ← কেনাকাটা চালিয়ে যান
        </a>
      </div>
    </div>
  );
}
