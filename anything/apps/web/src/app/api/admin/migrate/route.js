/**
 * GET  /api/admin/migrate        — list applied migrations
 * POST /api/admin/migrate        — run pending migrations
 *
 * This is a lightweight migration runner. It applies SQL files sequentially
 * and records them in a `_migrations` table so they only run once.
 *
 * Protected by PLATFORM_SECRET header.
 * Run manually after deployment: curl -X POST /api/admin/migrate -H "x-platform-secret: ..."
 */

import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

function assertPlatform(request) {
  const secret = process.env.PLATFORM_SECRET;
  const header = request.headers.get("x-platform-secret") ?? "";
  return secret && header === secret;
}

// ── Migration definitions (ordered) ──────────────────────────────────────────
// Add new migrations here. Never modify existing ones — they've already run.

const MIGRATIONS = [
  {
    id: "001_initial_schema",
    description:
      "Create core tables: stores, users, roles, products, orders, etc.",
    sql: `
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS stores (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text NOT NULL,
        slug text NOT NULL UNIQUE,
        custom_domain text UNIQUE,
        description text,
        logo_url text,
        contact_email text,
        contact_phone text,
        currency character(3) DEFAULT 'BDT',
        theme_config jsonb DEFAULT '{}',
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS roles (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
        name text NOT NULL,
        permissions jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now(),
        UNIQUE(name, store_id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id),
        email text NOT NULL,
        password_hash text NOT NULL,
        full_name text,
        is_active boolean DEFAULT true,
        is_superadmin boolean DEFAULT false,
        last_login_at timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE(store_id, email)
      );

      CREATE TABLE IF NOT EXISTS products (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        sku text NOT NULL,
        name text NOT NULL,
        description text,
        price numeric(12,2) DEFAULT 0,
        currency character(3) DEFAULT 'USD',
        stock_quantity integer DEFAULT 0,
        dynamic_attributes jsonb DEFAULT '{}',
        image_url text,
        status text DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE(store_id, sku)
      );

      CREATE TABLE IF NOT EXISTS shipping_zones (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        name text NOT NULL,
        code text NOT NULL,
        delivery_charge numeric(10,2) DEFAULT 0,
        estimated_days text,
        is_active boolean DEFAULT true,
        sort_order integer DEFAULT 0,
        created_at timestamptz DEFAULT now(),
        UNIQUE(store_id, code)
      );

      CREATE TABLE IF NOT EXISTS store_order_sequences (
        store_id uuid PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
        last_seq integer DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS orders (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        order_number text NOT NULL,
        status text DEFAULT 'pending' CHECK (status IN ('pending','processing','shipped','delivered','returned','cancelled')),
        customer_name text NOT NULL,
        customer_phone text NOT NULL,
        customer_email text,
        customer_address jsonb DEFAULT '{}',
        shipping_zone_id uuid REFERENCES shipping_zones(id) ON DELETE SET NULL,
        shipping_zone_name text,
        shipping_zone_code text,
        shipping_charge numeric(10,2) DEFAULT 0,
        estimated_delivery text,
        payment_method text DEFAULT 'cod',
        payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending','partial','paid','failed','refunded')),
        payment_meta jsonb DEFAULT '{}',
        currency character(3) DEFAULT 'BDT',
        subtotal numeric(12,2) DEFAULT 0,
        discount_amount numeric(12,2) DEFAULT 0,
        shipping_total numeric(12,2) DEFAULT 0,
        grand_total numeric(12,2) DEFAULT 0,
        capi_events_fired jsonb DEFAULT '{}',
        notes text,
        source text DEFAULT 'admin',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE(store_id, order_number)
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        product_id uuid REFERENCES products(id) ON DELETE SET NULL,
        sku text NOT NULL,
        name text NOT NULL,
        unit_price numeric(12,2) NOT NULL,
        quantity integer NOT NULL CHECK (quantity > 0),
        line_total numeric(12,2) NOT NULL,
        dynamic_attributes jsonb DEFAULT '{}',
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS order_status_history (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        from_status text,
        to_status text NOT NULL,
        changed_by uuid,
        note text,
        created_at timestamptz DEFAULT now()
      );
    `,
  },
  {
    id: "002_integration_configs",
    description: "Integration configs, IPN logs, webhooks",
    sql: `
      CREATE TABLE IF NOT EXISTS integration_configs (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        integration text NOT NULL,
        label text NOT NULL,
        category text DEFAULT 'payment',
        credentials jsonb DEFAULT '{}',
        public_config jsonb DEFAULT '{}',
        is_active boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE(store_id, integration)
      );

      CREATE TABLE IF NOT EXISTS ipn_logs (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
        integration text NOT NULL,
        raw_payload jsonb NOT NULL,
        verified boolean DEFAULT false,
        order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
        order_number text,
        action_taken text,
        error_message text,
        received_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS webhook_configs (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        target_url text NOT NULL,
        event_type text NOT NULL,
        secret_token text NOT NULL,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        webhook_id uuid NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        event_type text NOT NULL,
        payload jsonb NOT NULL,
        status text DEFAULT 'pending' CHECK (status IN ('pending','delivered','retrying','failed')),
        attempt_count integer DEFAULT 0,
        max_attempts integer DEFAULT 5,
        next_retry_at timestamptz,
        last_error text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS webhook_logs (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        webhook_id uuid NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        event_type text NOT NULL,
        payload jsonb NOT NULL,
        response_status integer,
        response_body text,
        error_message text,
        attempted_at timestamptz DEFAULT now()
      );
    `,
  },
  {
    id: "003_auth_extras",
    description: "Password reset tokens, user invites",
    sql: `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        token_hash text NOT NULL UNIQUE,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS user_invites (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        email text NOT NULL,
        role_id uuid NOT NULL REFERENCES roles(id),
        token_hash text NOT NULL UNIQUE,
        invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
        accepted_at timestamptz,
        expires_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `,
  },
  {
    id: "004_coupons",
    description: "Coupons and discount codes",
    sql: `
      CREATE TABLE IF NOT EXISTS coupons (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        code text NOT NULL,
        description text,
        discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','flat')),
        discount_value numeric(12,2) NOT NULL CHECK (discount_value > 0),
        min_order_value numeric(12,2) DEFAULT 0,
        max_uses integer,
        uses_count integer NOT NULL DEFAULT 0,
        is_active boolean NOT NULL DEFAULT true,
        expires_at timestamptz,
        created_at timestamptz DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_store_code ON coupons (store_id, upper(code));
    `,
  },
  {
    id: "005_indexes",
    description: "Performance indexes",
    sql: `
      CREATE INDEX IF NOT EXISTS idx_orders_store_created    ON orders (store_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_store_status     ON orders (store_id, status);
      CREATE INDEX IF NOT EXISTS idx_products_store_status   ON products (store_id, status);
      CREATE INDEX IF NOT EXISTS idx_products_dynamic_attrs  ON products USING gin (dynamic_attributes);
      CREATE INDEX IF NOT EXISTS idx_wb_del_status_retry     ON webhook_deliveries (status, next_retry_at) WHERE status IN ('pending','retrying');
      CREATE INDEX IF NOT EXISTS idx_prt_token_hash          ON password_reset_tokens (token_hash);
      CREATE INDEX IF NOT EXISTS idx_invites_token_hash      ON user_invites (token_hash);
      CREATE INDEX IF NOT EXISTS idx_users_email             ON users (email);
      CREATE INDEX IF NOT EXISTS idx_stores_slug             ON stores (slug);
      CREATE INDEX IF NOT EXISTS idx_stores_domain           ON stores (custom_domain);
    `,
  },
  {
    id: "006_wallets_and_extras",
    description:
      "Wallets, wallet ledger, abandoned carts, suppliers, notifications, withdrawals + missing columns",
    sql: `
      -- Add missing columns to stores
      ALTER TABLE stores ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'active'
        CHECK (billing_status IN ('active','trial','suspended','cancelled'));
      ALTER TABLE stores ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

      -- Add missing columns to products
      ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'own'
        CHECK (product_type IN ('own','dropship'));
      ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_cost numeric(12,2) DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_name text;

      -- Add missing columns to orders
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'own'
        CHECK (order_type IN ('own','dropship','mixed'));
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS cod_exact_amount numeric(12,2);
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES coupons(id) ON DELETE SET NULL;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text;

      -- Suppliers table
      CREATE TABLE IF NOT EXISTS suppliers (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        name text NOT NULL,
        contact text,
        email text,
        api_endpoint text,
        notes text,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now()
      );

      -- Wallets (one per store)
      CREATE TABLE IF NOT EXISTS wallets (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
        balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
        hold_amount numeric(14,2) NOT NULL DEFAULT 0,
        updated_at timestamptz DEFAULT now()
      );

      -- Wallet ledger (double-entry ledger)
      CREATE TABLE IF NOT EXISTS wallet_ledger (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
        txn_type text NOT NULL CHECK (txn_type IN ('credit','debit','hold','release','penalty','withdrawal')),
        amount numeric(12,2) NOT NULL,
        balance_after numeric(14,2) NOT NULL,
        note text,
        created_at timestamptz DEFAULT now()
      );

      -- Abandoned carts (session-keyed, store-scoped)
      CREATE TABLE IF NOT EXISTS abandoned_carts (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        session_key text NOT NULL,
        customer_name text,
        customer_phone text,
        customer_email text,
        cart_items jsonb NOT NULL DEFAULT '[]',
        cart_total numeric(12,2) DEFAULT 0,
        currency character(3) DEFAULT 'BDT',
        source_url text,
        recovered boolean DEFAULT false,
        last_seen_at timestamptz DEFAULT now(),
        created_at timestamptz DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_abandoned_carts_unique ON abandoned_carts (store_id, session_key);
      CREATE INDEX IF NOT EXISTS idx_abandoned_carts_store ON abandoned_carts (store_id, last_seen_at DESC);
      CREATE INDEX IF NOT EXISTS idx_abandoned_carts_session ON abandoned_carts (session_key);

      -- Notification logs (WhatsApp / SMS / email sends)
      CREATE TABLE IF NOT EXISTS notification_logs (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
        channel text NOT NULL DEFAULT 'whatsapp',
        recipient text NOT NULL,
        message_type text NOT NULL,
        payload jsonb DEFAULT '{}',
        status text DEFAULT 'queued',
        sent_at timestamptz,
        created_at timestamptz DEFAULT now()
      );

      -- Withdrawal requests
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        amount numeric(12,2) NOT NULL CHECK (amount > 0),
        status text NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','approved','rejected','paid')),
        bank_details jsonb DEFAULT '{}',
        note text,
        reviewed_by uuid,
        reviewed_at timestamptz,
        created_at timestamptz DEFAULT now()
      );

      -- Extra indexes
      CREATE INDEX IF NOT EXISTS idx_wallet_ledger_store ON wallet_ledger (store_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_suppliers_store ON suppliers (store_id);
      CREATE INDEX IF NOT EXISTS idx_orders_cod_pending ON orders (store_id, created_at DESC)
        WHERE payment_method = 'cod' AND payment_status = 'pending';
    `,
  },
  {
    id: "007_categories_and_images",
    description:
      "Product categories, product_categories junction, product images",
    sql: `
      -- Categories
      CREATE TABLE IF NOT EXISTS categories (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        name text NOT NULL,
        slug text NOT NULL,
        description text,
        image_url text,
        is_active boolean DEFAULT true,
        sort_order integer DEFAULT 0,
        created_at timestamptz DEFAULT now(),
        UNIQUE(store_id, slug)
      );

      -- Product ↔ Category junction
      CREATE TABLE IF NOT EXISTS product_categories (
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, category_id)
      );

      -- Product images (multi-image support)
      CREATE TABLE IF NOT EXISTS product_images (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
        url text NOT NULL,
        alt_text text,
        sort_order integer DEFAULT 0,
        is_primary boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_categories_store ON categories (store_id, sort_order);
      CREATE INDEX IF NOT EXISTS idx_product_categories_product ON product_categories (product_id);
      CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories (category_id);
      CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id, sort_order);
    `,
  },
];

// ── Migration runner ──────────────────────────────────────────────────────────

async function ensureMigrationTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id text PRIMARY KEY,
      description text,
      applied_at timestamptz DEFAULT now()
    )
  `;
}

export async function GET(request) {
  if (!assertPlatform(request))
    return apiResponse.forbidden("Platform access denied.");
  await ensureMigrationTable();
  const applied =
    await sql`SELECT id, description, applied_at FROM _migrations ORDER BY applied_at`;
  return apiResponse.success({
    applied,
    total: MIGRATIONS.length,
    pending: MIGRATIONS.length - applied.length,
  });
}

export async function POST(request) {
  if (!assertPlatform(request))
    return apiResponse.forbidden("Platform access denied.");
  await ensureMigrationTable();

  const applied = await sql`SELECT id FROM _migrations`;
  const appliedIds = new Set(applied.map((r) => r.id));
  const pending = MIGRATIONS.filter((m) => !appliedIds.has(m.id));

  if (!pending.length)
    return apiResponse.success({ message: "No pending migrations.", ran: [] });

  const ran = [];
  const errors = [];

  for (const migration of pending) {
    try {
      await sql(migration.sql);
      await sql`INSERT INTO _migrations (id, description) VALUES (${migration.id}, ${migration.description}) ON CONFLICT DO NOTHING`;
      ran.push({ id: migration.id, description: migration.description });
      console.log(`[migrate] Applied: ${migration.id}`);
    } catch (err) {
      console.error(`[migrate] Failed: ${migration.id}`, err.message);
      errors.push({ id: migration.id, error: err.message });
      break; // Stop on first error — migrations are sequential
    }
  }

  if (errors.length) {
    return Response.json({ success: false, ran, errors }, { status: 500 });
  }
  return apiResponse.success({
    message: `Applied ${ran.length} migration(s).`,
    ran,
  });
}
