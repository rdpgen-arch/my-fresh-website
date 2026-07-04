/**
 * useAnalytics — GA4 + CAPI deduplication hook (Task 2B & 2C)
 *
 * Provides a consistent `track(eventName, params)` interface for all
 * storefront events. Each event fires:
 *   1. A GA4 gtag() call (client-side, via GTM dataLayer)
 *   2. A server-side CAPI event via the webhook engine (deduplication via event_id)
 *
 * CAPI deduplication: both GA4 and our server CAPI send the same `event_id`
 * so the Facebook/Google ad server de-duplicates and counts only one conversion.
 *
 * Usage:
 *   const { track } = useAnalytics();
 *   track("purchase", { value: 1500, currency: "BDT", order_id: "ORD-..." });
 *   track("add_to_cart", { item_id: "...", item_name: "T-Shirt", value: 500 });
 *   track("begin_checkout", { value: 2000, currency: "BDT", num_items: 3 });
 */

import { useCallback, useRef } from "react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function pushDataLayer(event) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(event);
}

function gtagEvent(eventName, params) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
    return;
  }
  // Fallback: push to dataLayer (GTM picks it up)
  pushDataLayer({ event: eventName, ...params });
}

// ── GA4 event name mapping ─────────────────────────────────────────────────────
// Our internal names → GA4 recommended event names
const GA4_EVENT_MAP = {
  page_view: "page_view",
  view_item: "view_item",
  add_to_cart: "add_to_cart",
  remove_from_cart: "remove_from_cart",
  begin_checkout: "begin_checkout",
  purchase: "purchase",
  search: "search",
};

// ── Server-side CAPI relay ────────────────────────────────────────────────────

async function sendServerCAPI(storeSlug, eventName, params, eventId) {
  if (!storeSlug) return;
  try {
    await fetch("/api/storefront/capi-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeSlug, eventName, params, eventId }),
    });
  } catch {
    // Never block the UI on CAPI failure
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAnalytics(storeSlug = "") {
  // Deduplicate in-flight events (React strict mode fires effects twice in dev)
  const firedRef = useRef(new Set());

  const track = useCallback(
    (eventName, params = {}) => {
      const eventId = params.event_id ?? uuid();
      const dedupeKey = `${eventName}:${eventId}`;
      if (firedRef.current.has(dedupeKey)) return;
      firedRef.current.add(dedupeKey);

      const ga4Name = GA4_EVENT_MAP[eventName] ?? eventName;
      const ga4Params = { ...params, event_id: eventId };

      // 1. Fire client-side (GA4 / GTM)
      gtagEvent(ga4Name, ga4Params);

      // 2. Fire server-side CAPI for critical conversion events
      const CAPI_EVENTS = new Set([
        "purchase",
        "add_to_cart",
        "begin_checkout",
        "view_item",
      ]);
      if (CAPI_EVENTS.has(eventName)) {
        sendServerCAPI(storeSlug, eventName, params, eventId);
      }

      return eventId;
    },
    [storeSlug],
  );

  const trackPurchase = useCallback(
    (order, storeSlug_) => {
      track("purchase", {
        transaction_id: order.order_number,
        value: Number(order.grand_total),
        currency: order.currency ?? "BDT",
        num_items: (order.items ?? []).length,
        payment_type: order.payment_method,
        items: (order.items ?? []).map((i) => ({
          item_id: i.id ?? i.productId,
          item_name: i.name,
          price: Number(i.unitPrice ?? i.unit_price),
          quantity: i.quantity,
        })),
      });
    },
    [track],
  );

  const trackAddToCart = useCallback(
    (product, quantity, selectedAttrs = {}) => {
      track("add_to_cart", {
        item_id: product.id,
        item_name: product.name,
        item_category: product.category ?? "general",
        price: Number(product.price),
        currency: product.currency ?? "BDT",
        quantity,
        variant: Object.values(selectedAttrs).join("/") || undefined,
      });
    },
    [track],
  );

  const trackBeginCheckout = useCallback(
    (cartItems, total, currency = "BDT") => {
      track("begin_checkout", {
        value: Number(total),
        currency,
        num_items: cartItems.reduce((s, i) => s + i.quantity, 0),
        items: cartItems.map((i) => ({
          item_id: i.id,
          item_name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      });
    },
    [track],
  );

  const trackViewItem = useCallback(
    (product) => {
      track("view_item", {
        item_id: product.id,
        item_name: product.name,
        price: Number(product.price),
        currency: product.currency ?? "BDT",
      });
    },
    [track],
  );

  return {
    track,
    trackPurchase,
    trackAddToCart,
    trackBeginCheckout,
    trackViewItem,
  };
}
