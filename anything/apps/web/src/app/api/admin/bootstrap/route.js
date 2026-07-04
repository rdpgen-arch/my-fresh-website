/**
 * ONE-TIME Bootstrap Endpoint
 * POST/GET /api/admin/bootstrap
 * Creates: store, roles, admin user (argon2id hashed), shipping zones, coupons, products (25), orders (40)
 * Idempotent: returns 409 if store already exists.
 */
import sql from "@/app/api/utils/sql";
import argon2 from "argon2";

const FIRST_NAMES = [
  "Rahim",
  "Karim",
  "Nasrin",
  "Fatema",
  "Sohel",
  "Rubel",
  "Mithila",
  "Priya",
  "Arif",
  "Runa",
  "Tanvir",
  "Shirin",
  "Kabir",
  "Monika",
  "Jamal",
];
const LAST_NAMES = [
  "Hossain",
  "Islam",
  "Begum",
  "Akter",
  "Ahmed",
  "Khan",
  "Rahman",
  "Mia",
  "Chowdhury",
  "Das",
  "Roy",
  "Paul",
  "Sarkar",
  "Ali",
  "Uddin",
];
const DISTRICTS = [
  "Dhaka",
  "Chittagong",
  "Sylhet",
  "Rajshahi",
  "Khulna",
  "Barisal",
  "Rangpur",
  "Mymensingh",
  "Comilla",
  "Narayanganj",
  "Gazipur",
  "Narsingdi",
];

const CATALOG = [
  {
    name: "Premium Cotton Panjabi",
    cat: "Fashion",
    price: 1250,
    attrs: { Color: ["White", "Blue", "Gray"], Size: ["S", "M", "L", "XL"] },
  },
  {
    name: "Classic Denim Jeans",
    cat: "Fashion",
    price: 1850,
    attrs: { Color: ["Blue", "Black"], Size: ["30", "32", "34", "36"] },
  },
  {
    name: "Silk Saree (Jamdani)",
    cat: "Fashion",
    price: 3500,
    attrs: { Color: ["Red", "Green", "Purple"] },
  },
  {
    name: "Summer Kurti Set",
    cat: "Fashion",
    price: 950,
    attrs: {
      Size: ["S", "M", "L", "XL", "XXL"],
      Color: ["Pink", "Yellow", "Orange"],
    },
  },
  {
    name: "Casual T-Shirt (Pack of 3)",
    cat: "Fashion",
    price: 750,
    attrs: { Size: ["S", "M", "L", "XL"] },
  },
  {
    name: "Formal Blazer",
    cat: "Fashion",
    price: 4200,
    attrs: {
      Color: ["Black", "Navy", "Charcoal"],
      Size: ["38", "40", "42", "44"],
    },
  },
  {
    name: "Samsung A15 Smartphone",
    cat: "Electronics",
    price: 18500,
    attrs: { Storage: ["128GB", "256GB"], Color: ["Black", "Blue"] },
  },
  {
    name: "Wireless Earbuds",
    cat: "Electronics",
    price: 2200,
    attrs: { Color: ["White", "Black"] },
  },
  {
    name: "Portable Power Bank 20000mAh",
    cat: "Electronics",
    price: 1800,
    attrs: { Color: ["White", "Black", "Blue"] },
  },
  {
    name: "Smart Watch",
    cat: "Electronics",
    price: 3500,
    attrs: { Color: ["Black", "Silver", "Rose Gold"] },
  },
  {
    name: 'Laptop Bag 15.6"',
    cat: "Electronics",
    price: 1100,
    attrs: { Color: ["Black", "Gray", "Navy"] },
  },
  { name: "USB-C Hub 7-in-1", cat: "Electronics", price: 1650, attrs: {} },
  {
    name: "Rice Cooker 1.8L",
    cat: "Home & Kitchen",
    price: 2800,
    attrs: { Color: ["White", "Stainless"] },
  },
  {
    name: "Non-Stick Cookware Set",
    cat: "Home & Kitchen",
    price: 3200,
    attrs: { Size: ["3pcs", "5pcs", "7pcs"] },
  },
  {
    name: "Blender 700W",
    cat: "Home & Kitchen",
    price: 2100,
    attrs: { Color: ["White", "Black"] },
  },
  {
    name: "Bedsheet Set (King)",
    cat: "Home & Kitchen",
    price: 1450,
    attrs: { Color: ["White", "Gray", "Blue"] },
  },
  {
    name: "Skin Glow Face Cream",
    cat: "Beauty",
    price: 380,
    attrs: { Type: ["Normal Skin", "Oily Skin", "Dry Skin"] },
  },
  { name: "Hair Growth Serum", cat: "Beauty", price: 550, attrs: {} },
  { name: "Natural Aloe Vera Gel 200ml", cat: "Beauty", price: 280, attrs: {} },
  { name: "Vitamin C Sunscreen SPF50", cat: "Beauty", price: 490, attrs: {} },
  {
    name: "Kids Backpack School Bag",
    cat: "Kids",
    price: 780,
    attrs: { Color: ["Blue", "Pink", "Green", "Red"] },
  },
  {
    name: "Premium Notebook Set (5pcs)",
    cat: "Stationery",
    price: 220,
    attrs: {},
  },
  {
    name: "Sports Running Shoes",
    cat: "Sports",
    price: 2800,
    attrs: {
      Size: ["38", "39", "40", "41", "42", "43"],
      Color: ["White/Red", "Black/White"],
    },
  },
  {
    name: "Yoga Mat Non-Slip 6mm",
    cat: "Sports",
    price: 750,
    attrs: { Color: ["Purple", "Blue", "Green", "Black"] },
  },
  {
    name: "Leather Wallet (Men)",
    cat: "Accessories",
    price: 480,
    attrs: { Color: ["Brown", "Black"] },
  },
];

const IMAGES = [
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
  "https://images.unsplash.com/photo-1611186871525-9c0c7e7f0da3?w=600&q=80",
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80",
  "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80",
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80",
  "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600&q=80",
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function bootstrap() {
  const storeSlug = "onlinebdshop";
  const storeName = "OnlineBdshop";
  const adminEmail = "admin@acme.com";
  const adminPass = "Secure123!";
  const currency = "BDT";

  // ── Idempotency guard ─────────────────────────────────────────────
  const existing =
    await sql`SELECT id FROM stores WHERE slug = ${storeSlug} LIMIT 1`;
  if (existing[0]) {
    return Response.json(
      { success: false, message: `Store '${storeSlug}' already exists.` },
      { status: 409 },
    );
  }

  // ── 1. Hash password ──────────────────────────────────────────────
  const passwordHash = await argon2.hash(adminPass, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // ── 2. Store ──────────────────────────────────────────────────────
  const [store] = await sql`
    INSERT INTO stores (name, slug, currency, is_active, description, contact_email)
    VALUES (${storeName}, ${storeSlug}, ${currency}, true,
            ${"Premium online shop with fast delivery across Bangladesh."}, ${adminEmail})
    RETURNING id, name, slug
  `;
  const storeId = store.id;

  // ── 3. Roles ──────────────────────────────────────────────────────
  const [adminRole] = await sql`
    INSERT INTO roles (store_id, name, permissions)
    VALUES (${storeId}, 'Admin', ${JSON.stringify({ "*": ["*"] })})
    RETURNING id
  `;
  await sql`
    INSERT INTO roles (store_id, name, permissions) VALUES (${storeId}, 'Staff', ${JSON.stringify(
      {
        products: ["read", "write"],
        orders: ["read", "write"],
        users: ["read"],
        roles: ["read"],
        store: ["read"],
      },
    )})
  `;

  // ── 4. Sequence ───────────────────────────────────────────────────
  await sql`INSERT INTO store_order_sequences (store_id, last_seq) VALUES (${storeId}, 0) ON CONFLICT DO NOTHING`;

  // ── 5. Admin user ─────────────────────────────────────────────────
  const [adminUser] = await sql`
    INSERT INTO users (store_id, role_id, email, password_hash, full_name, is_active)
    VALUES (${storeId}, ${adminRole.id}, ${adminEmail}, ${passwordHash}, ${"Super Admin"}, true)
    RETURNING id, email
  `;

  // ── 6. Shipping zones ─────────────────────────────────────────────
  const zones = [
    {
      name: "Dhaka City",
      code: "dhaka-city",
      charge: 60,
      days: "1-2 days",
      sort: 1,
    },
    {
      name: "Dhaka District",
      code: "dhaka-dist",
      charge: 80,
      days: "2-3 days",
      sort: 2,
    },
    { name: "Chittagong", code: "ctg", charge: 100, days: "2-3 days", sort: 3 },
    { name: "Sylhet", code: "syl", charge: 120, days: "3-4 days", sort: 4 },
    { name: "Rajshahi", code: "raj", charge: 120, days: "3-4 days", sort: 5 },
    {
      name: "Rest of Bangladesh",
      code: "nationwide",
      charge: 130,
      days: "4-5 days",
      sort: 6,
    },
  ];
  for (const z of zones) {
    await sql`
      INSERT INTO shipping_zones (store_id, name, code, delivery_charge, estimated_days, is_active, sort_order)
      VALUES (${storeId}, ${z.name}, ${z.code}, ${z.charge}, ${z.days}, true, ${z.sort})
      ON CONFLICT (store_id, code) DO NOTHING
    `;
  }

  // ── 7. Coupons ────────────────────────────────────────────────────
  const coupons = [
    {
      code: "WELCOME10",
      type: "percentage",
      value: 10,
      desc: "Welcome 10% off",
      min: 500,
    },
    {
      code: "FLAT100",
      type: "flat",
      value: 100,
      desc: "৳100 flat discount",
      min: 1000,
    },
    {
      code: "NEWUSER20",
      type: "percentage",
      value: 20,
      desc: "New user 20% off",
      min: 800,
    },
    {
      code: "SAVE50",
      type: "flat",
      value: 50,
      desc: "৳50 off any order",
      min: 300,
    },
  ];
  for (const c of coupons) {
    await sql`
      INSERT INTO coupons (store_id, code, description, discount_type, discount_value, min_order_value, is_active)
      VALUES (${storeId}, ${c.code}, ${c.desc}, ${c.type}, ${c.value}, ${c.min}, true)
      ON CONFLICT DO NOTHING
    `;
  }

  // ── 8. Products ───────────────────────────────────────────────────
  const inserted = [];
  for (let i = 0; i < CATALOG.length; i++) {
    const p = CATALOG[i];
    const sku = `SKU-${String(i + 1).padStart(3, "0")}`;
    const attrs = { category: p.cat, ...p.attrs };
    const rows = await sql`
      INSERT INTO products (store_id, sku, name, description, price, currency, stock_quantity, dynamic_attributes, status, image_url)
      VALUES (${storeId}, ${sku}, ${p.name},
              ${"Genuine " + p.name.toLowerCase() + ". Warranty included. Fast delivery."},
              ${p.price}, ${currency}, ${rand(15, 200)}, ${JSON.stringify(attrs)}, 'published',
              ${IMAGES[i % IMAGES.length]})
      ON CONFLICT (store_id, sku) DO NOTHING
      RETURNING id, name, price
    `;
    if (rows[0]) inserted.push({ ...rows[0], sku });
  }

  // ── 9. Orders ─────────────────────────────────────────────────────
  const STATUSES = [
    "pending",
    "pending",
    "pending",
    "processing",
    "processing",
    "shipped",
    "delivered",
    "delivered",
    "cancelled",
  ];
  const PAY_METHS = ["cod", "cod", "cod", "cod", "bkash", "nagad"];
  const charges = [60, 80, 100, 120, 130];
  let seededOrders = 0;

  for (let i = 0; i < 40; i++) {
    await sql`UPDATE store_order_sequences SET last_seq = last_seq + 1 WHERE store_id = ${storeId}`;
    const [seqRow] =
      await sql`SELECT last_seq FROM store_order_sequences WHERE store_id = ${storeId}`;
    const seq = seqRow?.last_seq ?? i + 1;
    const now = new Date();
    const ds = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const orderNumber = `ORD-${ds}-${String(seq).padStart(5, "0")}`;
    const status = pick(STATUSES);
    const payMethod = pick(PAY_METHS);
    const payStatus = payMethod === "cod" ? "pending" : "paid";
    const shippingCharge = pick(charges);
    const customerName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const customerPhone =
      pick(["013", "015", "016", "017", "018", "019"]) +
      String(rand(10000000, 99999999));
    const address = {
      line1: `${rand(1, 50)} Road No. ${rand(1, 20)}`,
      district: pick(DISTRICTS),
      upazila: "Sadar",
    };

    const itemCount = Math.min(rand(1, 3), inserted.length || 1);
    const items = [];
    const used = new Set();
    for (let j = 0; j < itemCount; j++) {
      let idx = rand(0, inserted.length - 1);
      if (used.has(idx)) idx = (idx + 1) % inserted.length;
      used.add(idx);
      items.push({ prod: inserted[idx], qty: rand(1, 3) });
    }

    const subtotal = items.reduce((s, it) => s + it.prod.price * it.qty, 0);
    const grandTotal = subtotal + shippingCharge;
    const createdAt = new Date(Date.now() - rand(0, 90) * 86400000);

    const [order] = await sql`
      INSERT INTO orders (store_id, order_number, status, customer_name, customer_phone, customer_address,
                          payment_method, payment_status, currency, subtotal, shipping_total, grand_total,
                          shipping_charge, source, created_at, updated_at)
      VALUES (${storeId}, ${orderNumber}, ${status}, ${customerName}, ${customerPhone},
              ${JSON.stringify(address)}, ${payMethod}, ${payStatus}, ${currency},
              ${subtotal}, ${shippingCharge}, ${grandTotal}, ${shippingCharge},
              'storefront', ${createdAt}, ${createdAt})
      RETURNING id
    `;

    for (const it of items) {
      await sql`
        INSERT INTO order_items (order_id, store_id, product_id, sku, name, unit_price, quantity, line_total)
        VALUES (${order.id}, ${storeId}, ${it.prod.id}, ${it.prod.sku}, ${it.prod.name},
                ${it.prod.price}, ${it.qty}, ${it.prod.price * it.qty})
      `;
    }
    await sql`
      INSERT INTO order_status_history (order_id, store_id, to_status, note)
      VALUES (${order.id}, ${storeId}, ${status}, 'Seeded order')
    `;
    seededOrders++;
  }

  return Response.json(
    {
      success: true,
      message: `✅ Bootstrap complete!`,
      store: { id: storeId, name: storeName, slug: storeSlug },
      adminUser: { email: adminEmail },
      seeded: {
        products: inserted.length,
        orders: seededOrders,
        coupons: coupons.length,
        shippingZones: zones.length,
      },
      loginUrl: "/admin/login",
      storefrontUrl: "/onlinebdshop",
    },
    { status: 201 },
  );
}

export async function POST() {
  return bootstrap();
}
export async function GET() {
  return bootstrap();
}
