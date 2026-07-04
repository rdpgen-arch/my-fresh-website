/**
 * Email Service
 *
 * Centralised transactional email layer built on Resend.
 * All templates live here; the transport is in /api/utils/send-email.js.
 *
 * Every function fails gracefully — a broken email must never crash
 * a business-critical flow like checkout or status updates.
 */

import { sendEmail } from "@/app/api/utils/send-email";

const FROM = process.env.EMAIL_FROM ?? "noreply@platformhq.app";
const APP_URL =
  process.env.NEXT_PUBLIC_CREATE_APP_URL ?? "https://platformhq.app";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wrap(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:0}
    .outer{max-width:560px;margin:2rem auto;padding:1.5rem}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:2rem}
    .logo{font-size:0.875rem;font-weight:700;color:#0f172a;letter-spacing:-0.02em;margin-bottom:2rem;display:block}
    h1{font-size:1.25rem;font-weight:700;color:#0f172a;margin:0 0 0.75rem}
    p{font-size:0.9375rem;color:#475569;line-height:1.6;margin:0 0 1rem}
    .btn{display:inline-block;padding:0.625rem 1.25rem;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;font-size:0.875rem;font-weight:600;margin:0.5rem 0}
    .table{width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.875rem}
    .table th{text-align:left;color:#94a3b8;font-weight:600;padding:0.375rem 0;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid #e2e8f0}
    .table td{padding:0.5rem 0;color:#334155;border-bottom:1px solid #f1f5f9}
    .pill{display:inline-block;padding:2px 8px;border-radius:99px;font-size:0.75rem;font-weight:600}
    .pill-green{background:#dcfce7;color:#16a34a}
    .pill-yellow{background:#fef9c3;color:#a16207}
    .pill-blue{background:#dbeafe;color:#1d4ed8}
    .footer{text-align:center;margin-top:1.5rem;font-size:0.75rem;color:#94a3b8}
  </style></head><body><div class="outer"><div class="card">
  <span class="logo">PlatformHQ</span>
  ${content}
  </div><div class="footer">This email was sent by PlatformHQ. If you didn't expect it, you can safely ignore it.</div></div></body></html>`;
}

function formatCurrency(amount, currency = "BDT") {
  const sym = currency === "BDT" ? "৳" : "$";
  return `${sym}${Number(amount).toLocaleString("en-BD")}`;
}

// ─── 1. Order Confirmation ─────────────────────────────────────────────────────

export async function sendOrderConfirmation({ order, storeName, storeSlug }) {
  if (!order.customer_email) return;

  const itemsHtml = (order.items ?? [])
    .map(
      (i) =>
        `<tr><td>${i.name} <span style="color:#94a3b8;font-size:0.75rem">${i.sku}</span></td>
         <td style="text-align:right">${i.quantity} × ${formatCurrency(i.unit_price, order.currency)}</td>
         <td style="text-align:right;font-weight:600">${formatCurrency(i.line_total, order.currency)}</td></tr>`,
    )
    .join("");

  const html = wrap(`
    <h1>Order Confirmed 🎉</h1>
    <p>Hi ${order.customer_name}, thanks for your order from <strong>${storeName}</strong>!</p>
    <table class="table">
      <thead><tr><th>Item</th><th style="text-align:right">Qty × Price</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr><td colspan="2" style="text-align:right;color:#64748b;padding-top:0.75rem">Delivery</td>
            <td style="text-align:right;padding-top:0.75rem">${formatCurrency(order.shipping_total, order.currency)}</td></tr>
        <tr><td colspan="2" style="text-align:right;font-weight:700;font-size:1rem;padding-top:0.5rem">Grand Total</td>
            <td style="text-align:right;font-weight:800;font-size:1rem;padding-top:0.5rem">${formatCurrency(order.grand_total, order.currency)}</td></tr>
      </tfoot>
    </table>
    <p>Your order number is <strong style="font-family:monospace">${order.order_number}</strong>. 
       Payment method: ${order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}.</p>
    <a href="${APP_URL}/${storeSlug}/track?order=${order.order_number}&phone=${encodeURIComponent(order.customer_phone)}" class="btn">Track Your Order</a>
  `);

  return safeSend({
    to: order.customer_email,
    subject: `Order ${order.order_number} confirmed — ${storeName}`,
    html,
  });
}

// ─── 2. Order Status Update ────────────────────────────────────────────────────

const STATUS_COPY = {
  processing: {
    emoji: "⚙️",
    label: "Processing",
    body: "We're preparing your items for dispatch.",
  },
  shipped: {
    emoji: "🚚",
    label: "Shipped",
    body: "Your order is on its way! Expect delivery soon.",
  },
  delivered: {
    emoji: "✅",
    label: "Delivered",
    body: "Your order has been delivered. Enjoy!",
  },
  cancelled: {
    emoji: "❌",
    label: "Cancelled",
    body: "Your order has been cancelled. If you have questions, please contact us.",
  },
  returned: {
    emoji: "↩️",
    label: "Returned",
    body: "We've received your return and are processing it.",
  },
};

export async function sendOrderStatusUpdate({
  order,
  toStatus,
  storeName,
  storeSlug,
}) {
  if (!order.customer_email) return;
  const copy = STATUS_COPY[toStatus];
  if (!copy) return;

  const html = wrap(`
    <h1>${copy.emoji} Order ${copy.label}</h1>
    <p>Hi ${order.customer_name}, your order from <strong>${storeName}</strong> has been updated.</p>
    <p>${copy.body}</p>
    <p>Order number: <strong style="font-family:monospace">${order.order_number}</strong></p>
    <a href="${APP_URL}/${storeSlug}/track?order=${order.order_number}&phone=${encodeURIComponent(order.customer_phone)}" class="btn">Track Your Order</a>
  `);

  return safeSend({
    to: order.customer_email,
    subject: `Your order ${order.order_number} is ${copy.label.toLowerCase()} — ${storeName}`,
    html,
  });
}

// ─── 3. Staff New Order Notification ──────────────────────────────────────────

export async function sendStaffOrderNotification({
  order,
  storeName,
  staffEmail,
}) {
  const html = wrap(`
    <h1>New Order Received 🛒</h1>
    <p>A new order has been placed on <strong>${storeName}</strong>.</p>
    <table class="table">
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>Order #</td><td style="font-family:monospace">${order.order_number}</td></tr>
      <tr><td>Customer</td><td>${order.customer_name} · ${order.customer_phone}</td></tr>
      <tr><td>Payment</td><td>${order.payment_method} (${order.payment_status})</td></tr>
      <tr><td>Total</td><td><strong>${formatCurrency(order.grand_total, order.currency)}</strong></td></tr>
    </table>
    <a href="${APP_URL}/admin/orders/${order.id}" class="btn">View in Admin</a>
  `);

  return safeSend({
    to: staffEmail,
    subject: `[${storeName}] New order ${order.order_number} — ${formatCurrency(order.grand_total, order.currency)}`,
    html,
  });
}

// ─── 4. Password Reset ─────────────────────────────────────────────────────────

export async function sendPasswordReset({ email, resetUrl, storeName }) {
  const html = wrap(`
    <h1>Reset your password</h1>
    <p>We received a request to reset the password for your <strong>${storeName}</strong> admin account.</p>
    <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}" class="btn">Reset Password</a>
    <p style="margin-top:1.5rem;font-size:0.8125rem;color:#94a3b8">If you didn't request this, ignore this email. Your password won't change.</p>
  `);

  return safeSend({
    to: email,
    subject: `Reset your ${storeName} admin password`,
    html,
  });
}

// ─── 5. User Invite ────────────────────────────────────────────────────────────

export async function sendUserInvite({
  email,
  inviteUrl,
  storeName,
  invitedByName,
  roleName,
}) {
  const html = wrap(`
    <h1>You've been invited 🎉</h1>
    <p><strong>${invitedByName}</strong> has invited you to join the <strong>${storeName}</strong> admin panel as <strong>${roleName}</strong>.</p>
    <p>Click below to accept the invitation and set up your account. This invite expires in <strong>72 hours</strong>.</p>
    <a href="${inviteUrl}" class="btn">Accept Invitation</a>
    <p style="margin-top:1.5rem;font-size:0.8125rem;color:#94a3b8">If you weren't expecting this, you can safely ignore it.</p>
  `);

  return safeSend({
    to: email,
    subject: `You're invited to join ${storeName} on PlatformHQ`,
    html,
  });
}

// ─── Internal safe wrapper ────────────────────────────────────────────────────

async function safeSend(params) {
  try {
    return await sendEmail({ from: FROM, ...params });
  } catch (err) {
    // Never crash the calling flow — just log
    console.error("[email.service] Failed to send email:", err?.message ?? err);
    return null;
  }
}
