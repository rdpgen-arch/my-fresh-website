/**
 * Super-Admin Platform API
 *
 * GET  /api/platform/stores        — list all stores
 * POST /api/platform/stores        — create a new store + initial admin user
 *
 * Protected by PLATFORM_SECRET header. This is NOT tenant auth —
 * it is a platform-level secret known only to the platform owner.
 */

import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";
import argon2 from "argon2";

function assertPlatform(request) {
  const secret = process.env.PLATFORM_SECRET;
  if (!secret) throw new Error("PLATFORM_SECRET not configured.");
  const header = request.headers.get("x-platform-secret") ?? "";
  if (header !== secret) return false;
  return true;
}

export async function GET(request) {
  if (!assertPlatform(request))
    return apiResponse.forbidden("Platform access denied.");

  const stores = await sql`
    SELECT s.id, s.name, s.slug, s.custom_domain, s.is_active, s.created_at,
           COUNT(DISTINCT u.id)::int AS user_count,
           COUNT(DISTINCT o.id)::int AS order_count
    FROM   stores s
    LEFT JOIN users  u ON u.store_id = s.id
    LEFT JOIN orders o ON o.store_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `;
  return apiResponse.success(stores);
}

export async function POST(request) {
  if (!assertPlatform(request))
    return apiResponse.forbidden("Platform access denied.");

  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON.");
  }

  const {
    name,
    slug,
    customDomain,
    adminEmail,
    adminPassword,
    adminName,
    currency = "BDT",
  } = body ?? {};
  if (!name || !slug || !adminEmail || !adminPassword) {
    return apiResponse.badRequest(
      "name, slug, adminEmail, adminPassword are required.",
    );
  }
  if (adminPassword.length < 8)
    return apiResponse.badRequest(
      "Admin password must be at least 8 characters.",
    );

  // Check slug uniqueness
  const existing =
    await sql`SELECT id FROM stores WHERE slug = ${slug.toLowerCase().trim()} LIMIT 1`;
  if (existing[0])
    return apiResponse.conflict("A store with this slug already exists.");

  const passwordHash = await argon2.hash(adminPassword);

  // Create store + superadmin role + admin user in a transaction
  const store = await sql`
    INSERT INTO stores (name, slug, custom_domain, currency, is_active)
    VALUES (${name.trim()}, ${slug.toLowerCase().trim()}, ${customDomain ?? null}, ${currency}, true)
    RETURNING id, name, slug
  `;

  const storeId = store[0].id;

  // Create default roles for this store
  const adminRole = await sql`
    INSERT INTO roles (store_id, name, permissions)
    VALUES (${storeId}, 'Admin', ${JSON.stringify({
      "*": ["*"],
    })})
    RETURNING id
  `;

  await sql`INSERT INTO roles (store_id, name, permissions) VALUES (${storeId}, 'Staff', ${JSON.stringify(
    {
      products: ["read", "write"],
      orders: ["read", "write"],
      users: ["read"],
      roles: ["read"],
      webhooks: ["read"],
      store: ["read"],
    },
  )})`;

  await sql`INSERT INTO store_order_sequences (store_id, last_seq) VALUES (${storeId}, 0) ON CONFLICT DO NOTHING`;

  // Create admin user
  const adminUser = await sql`
    INSERT INTO users (store_id, role_id, email, password_hash, full_name, is_active)
    VALUES (${storeId}, ${adminRole[0].id}, ${adminEmail.toLowerCase().trim()}, ${passwordHash}, ${adminName ?? null}, true)
    RETURNING id, email, full_name
  `;

  return apiResponse.created({
    store: store[0],
    adminUser: adminUser[0],
  });
}
