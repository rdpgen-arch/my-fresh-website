/**
 * POST /api/admin/seed
 * Task 5B: Dummy Data Seeder — generates realistic Bangladeshi e-commerce test data.
 *
 * Protected by x-platform-secret header.
 *
 * Body: { storeSlug, products?, orders?, customers? }
 *   products  — number of products to generate (default 20)
 *   orders    — number of orders to generate   (default 30)
 *   customers — not seeded separately; embedded in orders
 *
 * Products cover common BD dropshipping categories: fashion, electronics,
 * beauty, home goods. Orders use realistic Bangladeshi names, districts,
 * phone numbers, and status distributions.
 */

import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

// ── Guard ────────────────────────────────────────────────────────────────────
function isPlatformAdmin(request) {
  return (
    request.headers.get("x-platform-secret") === process.env.PLATFORM_SECRET
  );
}

// ── Fake data pools ──────────────────────────────────────────────────────────
const FIRST_NAMES = [
  "Mohammed",
  "Rahman",
  "Karim",
  "Alam",
  "Islam",
  "Hossain",
  "Ahmed",
  "Ali",
  "Hassan",
  "Rahim",
  "Nasrin",
  "Fatema",
  "Sultana",
  "Khatun",
  "Begum",
  "Ritu",
  "Mitu",
  "Shirin",
  "Nadia",
  "Taslima",
];
const LAST_NAMES = [
  "Khan",
  "Chowdhury",
  "Sarkar",
  "Miah",
  "Sheikh",
  "Biswas",
  "Das",
  "Roy",
  "Paul",
  "Dey",
  "Mondal",
  "Hasan",
  "Hossain",
  "Akter",
  "Begum",
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
  "Cumilla",
  "Narayanganj",
  "Gazipur",
  "Tangail",
  "Bogura",
  "Noakhali",
  "Jessore",
];
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
const PAY_METHODS = ["cod", "cod", "cod", "bkash", "nagad"];
const PAY_STATUSES = { cod: "pending", bkash: "paid", nagad: "paid" };
const ROAD_SUFFIXES = ["Road", "Lane", "Street", "Avenue", "Marg", "Nagar"];

const PRODUCT_CATALOG = [
  // Fashion
  {
    name: "Classic White Panjabi",
    cat: "fashion",
    price: [950, 2200],
    sku_prefix: "PNJ",
  },
  {
    name: "Cotton Salwar Kameez",
    cat: "fashion",
    price: [1200, 3500],
    sku_prefix: "SKZ",
  },
  {
    name: "Men's Slim-Fit Chinos",
    cat: "fashion",
    price: [750, 1800],
    sku_prefix: "CHN",
  },
  {
    name: "Women's Kurti (Printed)",
    cat: "fashion",
    price: [600, 1400],
    sku_prefix: "KRT",
  },
  {
    name: "Jamdani Saree",
    cat: "fashion",
    price: [3500, 8000],
    sku_prefix: "SAR",
  },
  {
    name: "Polo T-Shirt (Export Quality)",
    cat: "fashion",
    price: [450, 900],
    sku_prefix: "PLO",
  },
  {
    name: "Denim Jacket (Washed)",
    cat: "fashion",
    price: [1800, 4000],
    sku_prefix: "DNM",
  },
  // Electronics
  {
    name: "Bluetooth Earbuds (TWS)",
    cat: "electronics",
    price: [450, 1200],
    sku_prefix: "EBD",
  },
  {
    name: "Type-C Fast Charger 65W",
    cat: "electronics",
    price: [350, 850],
    sku_prefix: "CHR",
  },
  {
    name: "Power Bank 20000mAh",
    cat: "electronics",
    price: [800, 2000],
    sku_prefix: "PWR",
  },
  {
    name: "Smartwatch M16 Plus",
    cat: "electronics",
    price: [650, 1500],
    sku_prefix: "SWT",
  },
  {
    name: "Phone Stand + Ring Light",
    cat: "electronics",
    price: [350, 750],
    sku_prefix: "RLT",
  },
  // Beauty
  {
    name: "Vitamin C Serum (30ml)",
    cat: "beauty",
    price: [450, 1100],
    sku_prefix: "SRM",
  },
  {
    name: "Hair Growth Oil (100ml)",
    cat: "beauty",
    price: [280, 650],
    sku_prefix: "HRO",
  },
  {
    name: "Whitening Face Wash",
    cat: "beauty",
    price: [180, 420],
    sku_prefix: "FCW",
  },
  {
    name: "Sunscreen SPF50 (50g)",
    cat: "beauty",
    price: [350, 850],
    sku_prefix: "SUN",
  },
  // Home & Kitchen
  {
    name: "Non-Stick Frying Pan 28cm",
    cat: "home",
    price: [450, 1200],
    sku_prefix: "PAN",
  },
  {
    name: "Stainless Steel Water Bottle 1L",
    cat: "home",
    price: [250, 650],
    sku_prefix: "BTL",
  },
  {
    name: "Bamboo Cutting Board Set",
    cat: "home",
    price: [380, 900],
    sku_prefix: "CUT",
  },
  {
    name: "LED Night Light (USB)",
    cat: "home",
    price: [150, 380],
    sku_prefix: "LED",
  },
];

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}
function randBDPhone() {
  const ops = ["013", "015", "016", "017", "018", "019"];
  return `${pick(ops)}${rand(10000000, 99999999)}`;
}
function randPrice(range) {
  return rand(range[0], range[1]);
}
function ordNum(seq) {
  return `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(seq).padStart(5, "0")}`;
}

export async function POST(request) {
  if (!isPlatformAdmin(request))
    return apiResponse.forbidden("Platform secret required.");

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const {
    storeSlug,
    products: numProducts = 20,
    orders: numOrders = 30,
  } = body;
  if (!storeSlug) return apiResponse.badRequest("storeSlug is required.");

  // Resolve store
  const stores =
    await sql`SELECT id, currency FROM stores WHERE slug = ${storeSlug} LIMIT 1`;
  if (!stores[0]) return apiResponse.notFound("Store not found.");
  const { id: storeId, currency = "BDT" } = stores[0];

  // ── Seed products ────────────────────────────────────────────────────────
  const catalog = [...PRODUCT_CATALOG];
  while (catalog.length < numProducts) catalog.push(...PRODUCT_CATALOG); // wrap
  const seedProducts = catalog.slice(0, numProducts);

  const insertedProducts = [];
  for (let i = 0; i < seedProducts.length; i++) {
    const p = seedProducts[i];
    const price = randPrice(p.price);
    const sku = `${p.sku_prefix}-${String(i + 1).padStart(3, "0")}`;
    try {
      const rows = await sql`
        INSERT INTO products (store_id, sku, name, price, currency, stock_quantity, status,
          dynamic_attributes, description)
        VALUES (
          ${storeId}, ${sku}, ${p.name}, ${price}, ${currency},
          ${rand(10, 200)}, 'published',
          ${JSON.stringify({ category: p.cat })},
          ${"Seed product — " + p.cat + " category. Perfect for testing checkout flows."}
        )
        ON CONFLICT (store_id, sku) DO NOTHING
        RETURNING id, sku, name, price
      `;
      if (rows[0]) insertedProducts.push(rows[0]);
    } catch {
      /* skip on conflict */
    }
  }

  // ── Seed orders ───────────────────────────────────────────────────────────
  // Ensure sequence row exists
  await sql`
    INSERT INTO store_order_sequences (store_id, last_seq) VALUES (${storeId}, 0)
    ON CONFLICT (store_id) DO NOTHING
  `;

  const seqRows =
    await sql`SELECT last_seq FROM store_order_sequences WHERE store_id = ${storeId}`;
  let seqStart = Number(seqRows[0]?.last_seq ?? 0);

  const insertedOrders = [];
  for (let i = 0; i < numOrders; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const customerName = `${firstName} ${lastName}`;
    const phone = randBDPhone();
    const status = pick(STATUSES);
    const payMethod = pick(PAY_METHODS);
    const payStatus = PAY_STATUSES[payMethod] ?? "pending";
    const district = pick(DISTRICTS);
    const address = {
      line1: `${rand(1, 200)} ${pick(DISTRICTS)} ${pick(ROAD_SUFFIXES)}`,
      district,
      country: "Bangladesh",
    };

    // Pick 1-3 random products for this order
    const numItems = rand(1, 3);
    const orderProds = [];
    for (let j = 0; j < numItems; j++) {
      const prod = pick(
        insertedProducts.length > 0
          ? insertedProducts
          : [
              {
                id: null,
                sku: `SEED-${j}`,
                name: "Sample Product",
                price: 500,
              },
            ],
      );
      orderProds.push({ ...prod, qty: rand(1, 3) });
    }
    const subtotal = orderProds.reduce(
      (s, p) => s + Number(p.price) * p.qty,
      0,
    );
    const shipping = rand(0, 1) === 0 ? 60 : 120;
    const grandTotal = subtotal + shipping;
    seqStart++;
    const orderNumber = ordNum(seqStart);
    // Random date within past 90 days
    const daysAgo = rand(0, 90);
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

    try {
      const oRows = await sql`
        INSERT INTO orders (
          store_id, order_number, status, customer_name, customer_phone,
          customer_address, shipping_charge, payment_method, payment_status,
          currency, subtotal, discount_amount, shipping_total, grand_total,
          source, created_at, updated_at
        ) VALUES (
          ${storeId}, ${orderNumber}, ${status}, ${customerName}, ${phone},
          ${JSON.stringify(address)}, ${shipping}, ${payMethod}, ${payStatus},
          ${currency}, ${subtotal}, 0, ${shipping}, ${grandTotal},
          'storefront', ${createdAt}, ${createdAt}
        ) ON CONFLICT DO NOTHING RETURNING id, order_number
      `;
      if (oRows[0]) {
        // Insert items
        await Promise.all(
          orderProds.map(
            (op) =>
              sql`INSERT INTO order_items (order_id, store_id, product_id, sku, name, unit_price, quantity, line_total)
              VALUES (${oRows[0].id}, ${storeId}, ${op.id ?? null}, ${op.sku}, ${op.name},
                      ${Number(op.price)}, ${op.qty}, ${Number(op.price) * op.qty})`,
          ),
        );
        // Status history
        await sql`INSERT INTO order_status_history (order_id, store_id, from_status, to_status, note)
                  VALUES (${oRows[0].id}, ${storeId}, NULL, 'pending', 'Seeded order')`;
        insertedOrders.push(oRows[0].order_number);
      }
    } catch {
      /* skip */
    }
  }

  // Update sequence
  await sql`UPDATE store_order_sequences SET last_seq = ${seqStart} WHERE store_id = ${storeId}`;

  return apiResponse.ok({
    message: `Seeded ${insertedProducts.length} products and ${insertedOrders.length} orders for store "${storeSlug}".`,
    products: insertedProducts.length,
    orders: insertedOrders.length,
  });
}
