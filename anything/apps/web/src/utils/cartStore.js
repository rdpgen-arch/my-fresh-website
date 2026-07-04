/**
 * Client-Side Cart Store — Zustand with localStorage persistence.
 *
 * The cart is completely ephemeral on the client. No server state.
 * It stores product snapshots so cart items remain accurate even if
 * the product is later edited or deleted.
 *
 * Shape of a cart item:
 *  {
 *    id:               string (product UUID),
 *    sku:              string,
 *    name:             string,
 *    price:            number,
 *    currency:         string,
 *    quantity:         number,
 *    selectedAttributes: { size: "M", color: "Blue" },  ← user selections
 *    dynamicAttributes:  { … }  ← full snapshot from product
 *  }
 */

import { create } from "zustand";

// ─── Persistence helpers (SSR-safe) ──────────────────────────────────────────

function loadCart() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("cart");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("cart", JSON.stringify(items));
  } catch {}
}

// ─── Unique cart key ──────────────────────────────────────────────────────────

/**
 * Two items are "the same" if they share a product ID AND selected attributes.
 * This allows adding "Red XL" and "Blue XL" as separate line items.
 */
function cartKey(productId, selectedAttributes) {
  const attrStr = Object.entries(selectedAttributes ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
  return `${productId}__${attrStr}`;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCartStore = create((set, get) => ({
  items: loadCart(),

  // ── Computed ────────────────────────────────────────────────────────────
  get count() {
    return get().items.reduce((sum, i) => sum + i.quantity, 0);
  },
  get subtotal() {
    return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  // ── Actions ─────────────────────────────────────────────────────────────

  /**
   * Add a product to the cart, or increment quantity if already present.
   * @param {object} product         - Full product object from API.
   * @param {number} quantity        - How many to add (default 1).
   * @param {object} selectedAttrs   - User's selected variant attributes.
   */
  addItem(product, quantity = 1, selectedAttrs = {}) {
    const key = cartKey(product.id, selectedAttrs);
    set((state) => {
      const existing = state.items.find((i) => i._key === key);
      let newItems;
      if (existing) {
        newItems = state.items.map((i) =>
          i._key === key ? { ...i, quantity: i.quantity + quantity } : i,
        );
      } else {
        const newItem = {
          _key: key,
          id: product.id,
          sku: product.sku,
          name: product.name,
          price: Number(product.price),
          currency: product.currency,
          image_url: product.image_url ?? null,
          quantity,
          selectedAttributes: selectedAttrs,
          dynamicAttributes: product.dynamic_attributes ?? {},
        };
        newItems = [...state.items, newItem];
      }
      saveCart(newItems);
      return { items: newItems };
    });
  },

  /**
   * Set the exact quantity for a cart item. Removes it if quantity reaches 0.
   */
  setQuantity(key, quantity) {
    set((state) => {
      const newItems =
        quantity <= 0
          ? state.items.filter((i) => i._key !== key)
          : state.items.map((i) => (i._key === key ? { ...i, quantity } : i));
      saveCart(newItems);
      return { items: newItems };
    });
  },

  removeItem(key) {
    set((state) => {
      const newItems = state.items.filter((i) => i._key !== key);
      saveCart(newItems);
      return { items: newItems };
    });
  },

  clearCart() {
    saveCart([]);
    set({ items: [] });
  },

  // Hydrate from localStorage on client mount
  hydrate() {
    set({ items: loadCart() });
  },
}));
