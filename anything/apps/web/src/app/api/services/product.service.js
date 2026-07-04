/**
 * Product Service
 *
 * Pure business logic layer. Zero HTTP awareness — no Request/Response objects.
 * Every public function requires a `storeId`. Callers that omit it will throw,
 * making accidental cross-tenant leaks impossible by design.
 *
 * Dynamic Attribute Contract:
 *   `dynamic_attributes` is a JSONB column. This service treats it as an opaque
 *   object — any shape is valid. Type-level validation (e.g., "T-shirt must have
 *   `size` and `color`") is left to higher-level product-type schemas (future scope).
 */

import sql from "@/app/api/utils/sql";

// ─── Guard ───────────────────────────────────────────────────────────────────

/**
 * Internal safety check. All service functions must call this first.
 * @param {string} storeId
 */
function assertStoreId(storeId) {
  if (!storeId || typeof storeId !== "string") {
    throw new Error(
      "[ProductService] storeId is required but was not provided. " +
        "This is a programming error — never call service functions outside of withTenant.",
    );
  }
}

// ─── Read Operations ─────────────────────────────────────────────────────────

/**
 * Lists products for a tenant with optional filtering and pagination.
 *
 * @param {object} opts
 * @param {string}   opts.storeId         - Tenant boundary (required).
 * @param {string}   [opts.status]        - Filter by status: draft | published | archived.
 * @param {string}   [opts.search]        - Partial match on name or SKU.
 * @param {number}   [opts.page=1]        - Page number (1-based).
 * @param {number}   [opts.limit=50]      - Rows per page (max 200).
 * @param {string}   [opts.sortBy='created_at'] - Column to sort by.
 * @param {string}   [opts.sortDir='desc']      - 'asc' or 'desc'.
 * @returns {Promise<{ products: object[], total: number, page: number, limit: number }>}
 */
export async function listProducts({
  storeId,
  status,
  search,
  page = 1,
  limit = 50,
  sortBy = "created_at",
  sortDir = "desc",
}) {
  assertStoreId(storeId);

  const safeLimit = Math.min(Number(limit) || 50, 200);
  const safeOffset = (Math.max(Number(page) || 1, 1) - 1) * safeLimit;

  // Whitelist sortable columns to prevent SQL injection via ORDER BY
  const SORTABLE_COLUMNS = [
    "name",
    "sku",
    "price",
    "stock_quantity",
    "status",
    "created_at",
    "updated_at",
  ];
  const orderByCol = SORTABLE_COLUMNS.includes(sortBy) ? sortBy : "created_at";
  const orderByDir = sortDir === "asc" ? "ASC" : "DESC";

  // Build WHERE clauses dynamically
  const conditions = ["p.store_id = $1"];
  const params = [storeId];
  let paramIdx = 2;

  if (status) {
    conditions.push(`p.status = $${paramIdx++}`);
    params.push(status);
  }

  if (search) {
    conditions.push(`(p.name ILIKE $${paramIdx} OR p.sku ILIKE $${paramIdx})`);
    params.push(`%${search}%`);
    paramIdx++;
  }

  const whereClause = conditions.join(" AND ");

  const dataQuery = `
    SELECT
      p.id,
      p.sku,
      p.name,
      p.description,
      p.price,
      p.currency,
      p.stock_quantity,
      p.dynamic_attributes,
      p.status,
      p.image_url,
      p.created_at,
      p.updated_at
    FROM   products p
    WHERE  ${whereClause}
    ORDER  BY p.${orderByCol} ${orderByDir}
    LIMIT  $${paramIdx} OFFSET $${paramIdx + 1}
  `;
  params.push(safeLimit, safeOffset);

  const countQuery = `SELECT COUNT(*) AS total FROM products p WHERE ${whereClause}`;
  // Count query uses the same params except limit/offset
  const countParams = params.slice(0, paramIdx - 1);

  const [products, [{ total }]] = await sql.transaction([
    sql(dataQuery, params),
    sql(countQuery, countParams),
  ]);

  return {
    products,
    total: Number(total),
    page: Math.max(Number(page), 1),
    limit: safeLimit,
  };
}

/**
 * Fetches a single product by ID, scoped to the tenant.
 *
 * @param {object} opts
 * @param {string} opts.storeId   - Tenant boundary (required).
 * @param {string} opts.productId - Product UUID.
 * @returns {Promise<object|null>}
 */
export async function getProduct({ storeId, productId }) {
  assertStoreId(storeId);

  const rows = await sql`
    SELECT
      id, sku, name, description, price, currency,
      stock_quantity, dynamic_attributes, status, image_url, created_at, updated_at
    FROM  products
    WHERE store_id = ${storeId}
      AND id       = ${productId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * Creates a new product for a tenant.
 *
 * `dynamic_attributes` is stored as-is (JSONB). No shape enforcement here.
 *
 * @param {object} opts
 * @param {string}  opts.storeId           - Tenant boundary (required).
 * @param {string}  opts.sku
 * @param {string}  opts.name
 * @param {string}  [opts.description]
 * @param {number}  opts.price
 * @param {string}  [opts.currency='USD']
 * @param {number}  [opts.stockQuantity=0]
 * @param {object}  [opts.dynamicAttributes={}]
 * @param {string}  [opts.status='draft']
 * @param {string}  [opts.imageUrl=null]
 * @returns {Promise<object>} The created product row.
 */
export async function createProduct({
  storeId,
  sku,
  name,
  description = null,
  price,
  currency = "USD",
  stockQuantity = 0,
  dynamicAttributes = {},
  status = "draft",
  imageUrl = null,
}) {
  assertStoreId(storeId);

  // ── Validate required fields ──────────────────────────────────────────────
  const errors = {};
  if (!sku || typeof sku !== "string") errors.sku = "SKU is required.";
  if (!name || typeof name !== "string") errors.name = "Name is required.";
  if (price === undefined || price === null || isNaN(Number(price))) {
    errors.price = "Price must be a valid number.";
  }
  if (!["draft", "published", "archived"].includes(status)) {
    errors.status = "Status must be draft, published, or archived.";
  }

  if (Object.keys(errors).length > 0) {
    const err = new Error("Validation failed");
    err.code = "VALIDATION_ERROR";
    err.details = errors;
    throw err;
  }

  const rows = await sql`
    INSERT INTO products (
      store_id, sku, name, description, price, currency,
      stock_quantity, dynamic_attributes, status, image_url
    ) VALUES (
      ${storeId},
      ${sku.trim()},
      ${name.trim()},
      ${description},
      ${Number(price)},
      ${currency.toUpperCase()},
      ${Number(stockQuantity)},
      ${JSON.stringify(dynamicAttributes)},
      ${status},
      ${imageUrl}
    )
    RETURNING *
  `;

  return rows[0];
}

/**
 * Partially updates a product. Only provided fields are changed.
 *
 * `dynamic_attributes` is merged (shallow) with the existing value,
 * allowing clients to add/update individual attributes without
 * overwriting the entire object.
 *
 * @param {object} opts
 * @param {string}  opts.storeId   - Tenant boundary (required).
 * @param {string}  opts.productId
 * @param {object}  opts.updates   - Partial product fields to update.
 * @returns {Promise<object|null>}
 */
export async function updateProduct({ storeId, productId, updates }) {
  assertStoreId(storeId);

  // Confirm product belongs to this tenant before updating
  const existing = await getProduct({ storeId, productId });
  if (!existing) return null;

  const ALLOWED_FIELDS = [
    "sku",
    "name",
    "description",
    "price",
    "currency",
    "stock_quantity",
    "status",
    "image_url",
  ];

  const setClauses = [];
  const values = [];
  let paramIdx = 1;

  for (const field of ALLOWED_FIELDS) {
    const camelKey = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const value = updates[field] ?? updates[camelKey];
    if (value !== undefined) {
      setClauses.push(`${field} = $${paramIdx++}`);
      values.push(field === "price" ? Number(value) : value);
    }
  }

  // Handle dynamic_attributes with a shallow merge via JSONB concatenation
  if (
    updates.dynamicAttributes !== undefined ||
    updates.dynamic_attributes !== undefined
  ) {
    const incoming = updates.dynamicAttributes ?? updates.dynamic_attributes;
    setClauses.push(
      `dynamic_attributes = dynamic_attributes || $${paramIdx++}`,
    );
    values.push(JSON.stringify(incoming));
  }

  if (setClauses.length === 0) {
    return existing; // Nothing to update — return existing record
  }

  // Always bump updated_at
  setClauses.push(`updated_at = NOW()`);

  values.push(productId, storeId);
  const whereIdx = paramIdx;

  const query = `
    UPDATE products
    SET    ${setClauses.join(", ")}
    WHERE  id       = $${whereIdx}
      AND  store_id = $${whereIdx + 1}
    RETURNING *
  `;

  const rows = await sql(query, values);
  return rows[0] ?? null;
}

/**
 * Deletes a product. The store_id guard ensures cross-tenant deletion is impossible.
 *
 * @param {object} opts
 * @param {string} opts.storeId   - Tenant boundary (required).
 * @param {string} opts.productId
 * @returns {Promise<boolean>} True if a row was deleted.
 */
export async function deleteProduct({ storeId, productId }) {
  assertStoreId(storeId);

  const rows = await sql`
    DELETE FROM products
    WHERE  id       = ${productId}
      AND  store_id = ${storeId}
    RETURNING id
  `;

  return rows.length > 0;
}
