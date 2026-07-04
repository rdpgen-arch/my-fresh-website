/**
 * Auth Service
 *
 * Handles credential verification, token issuance, and all user/role CRUD.
 * Argon2id is used for password hashing — the strongest standard for
 * password storage (resistant to GPU and side-channel attacks).
 *
 * ── Permission Model ─────────────────────────────────────────────────────────
 *
 *  Permissions are stored in `roles.permissions` (JSONB) as a flat map:
 *
 *    { "products": ["read","write","delete"], "orders": ["read"], "users": [] }
 *
 *  Wildcard super-admin:
 *
 *    { "*": ["*"] }
 *
 *  A permission string used in `withRole` takes the form:
 *
 *    "<resource>:<action>"  →  "products:write", "orders:read", "users:delete"
 *
 *  The checker resolves as:
 *    1. Does role have `"*": ["*"]`?  → GRANT ALL
 *    2. Does role have `resource: ["*"]`? → GRANT ALL actions on resource
 *    3. Does role have `resource: [..., action, ...]`? → GRANT
 *    4. Otherwise → DENY (403)
 */

import argon2 from "argon2";
import sql from "@/app/api/utils/sql";
import { signJWT } from "@/app/api/utils/jwt";

// ─── Guard ────────────────────────────────────────────────────────────────────

function assertStoreId(storeId) {
  if (!storeId || typeof storeId !== "string") {
    throw new Error(
      "[AuthService] storeId is required. Never call auth service functions outside withTenant.",
    );
  }
}

// ─── Permission Resolver ──────────────────────────────────────────────────────

/**
 * Checks whether a JSONB permissions object satisfies a required permission string.
 *
 * @param {object} permissions  - The role's `permissions` JSONB object.
 * @param {string} required     - e.g. "products:write"
 * @returns {boolean}
 */
export function hasPermission(permissions, required) {
  if (!permissions || typeof permissions !== "object") return false;

  // Super-admin wildcard: { "*": ["*"] }
  if (permissions["*"]?.includes("*")) return true;

  const [resource, action] = required.split(":");
  if (!resource || !action) return false;

  const allowed = permissions[resource];
  if (!Array.isArray(allowed)) return false;

  // Resource-level wildcard: { "products": ["*"] }
  if (allowed.includes("*")) return true;

  return allowed.includes(action);
}

/**
 * Checks whether a JSONB permissions object satisfies ALL required permissions.
 *
 * @param {object} permissions      - The role's `permissions` JSONB object.
 * @param {string[]} requiredPerms  - Array of required permission strings.
 * @returns {boolean}
 */
export function hasAllPermissions(permissions, requiredPerms) {
  return requiredPerms.every((perm) => hasPermission(permissions, perm));
}

// ─── Token Issuance ───────────────────────────────────────────────────────────

/**
 * Issues a signed JWT with all claims needed by withTenant and withRole.
 *
 * @param {object} user  - User row from the database.
 * @param {object} role  - Role row (must include `permissions`).
 * @returns {Promise<string>}  Signed JWT.
 */
async function issueToken(user, role) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured.");

  return signJWT(
    {
      userId: user.id,
      storeId: user.store_id,
      roleId: user.role_id,
      email: user.email,
      // Embed a compact permission snapshot so withRole never hits the DB.
      // On role change, the user must re-login for new permissions to take effect.
      permissions: role.permissions,
    },
    secret,
    60 * 60 * 8, // 8-hour expiry
  );
}

// ─── Auth Operations ──────────────────────────────────────────────────────────

/**
 * Verifies credentials and returns a signed JWT + safe user object.
 *
 * The query is intentionally scoped to a store to enforce tenant isolation
 * even at login — email collisions across tenants are irrelevant.
 *
 * @param {object} opts
 * @param {string} opts.storeSlug  - Used to identify the tenant at login time.
 * @param {string} opts.email
 * @param {string} opts.password   - Plaintext password from the form.
 * @returns {Promise<{ token: string, user: object }>}
 */
export async function login({ storeSlug, email, password }) {
  if (!storeSlug || !email || !password) {
    const err = new Error("storeSlug, email, and password are all required.");
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  // Resolve the store by slug first
  const storeRows = await sql`
    SELECT id, name, is_active FROM stores WHERE slug = ${storeSlug} LIMIT 1
  `;
  const store = storeRows[0];

  if (!store) {
    const err = new Error("Store not found.");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (!store.is_active) {
    const err = new Error("This store is suspended.");
    err.code = "FORBIDDEN";
    throw err;
  }

  // Fetch user within the resolved store
  const userRows = await sql`
    SELECT
      u.id, u.store_id, u.role_id, u.email, u.full_name,
      u.password_hash, u.is_active,
      r.name        AS role_name,
      r.permissions AS role_permissions
    FROM  users u
    JOIN  roles r ON r.id = u.role_id
    WHERE u.store_id = ${store.id}
      AND u.email    = ${email.toLowerCase().trim()}
    LIMIT 1
  `;
  const user = userRows[0];

  // Timing-safe path: always run argon2 verify even if user not found,
  // using a dummy hash. This prevents user-enumeration via timing attacks.
  const DUMMY_HASH =
    "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG";
  const hashToVerify = user?.password_hash ?? DUMMY_HASH;
  const passwordMatch = await argon2.verify(hashToVerify, password);

  if (!user || !passwordMatch) {
    const err = new Error("Invalid email or password.");
    err.code = "INVALID_CREDENTIALS";
    throw err;
  }

  if (!user.is_active) {
    const err = new Error(
      "Your account has been deactivated. Contact your store admin.",
    );
    err.code = "FORBIDDEN";
    throw err;
  }

  // Stamp last login timestamp (non-blocking — don't await in the critical path)
  sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`.catch(
    () => {},
  );

  const token = await issueToken(user, {
    permissions: user.role_permissions,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      roleId: user.role_id,
      roleName: user.role_name,
      storeId: user.store_id,
    },
  };
}

// ─── User CRUD ────────────────────────────────────────────────────────────────

export async function listUsers({ storeId }) {
  assertStoreId(storeId);
  return sql`
    SELECT
      u.id, u.email, u.full_name, u.is_active, u.last_login_at,
      u.created_at, u.role_id,
      r.name AS role_name
    FROM  users u
    JOIN  roles r ON r.id = u.role_id
    WHERE u.store_id = ${storeId}
    ORDER BY u.created_at DESC
  `;
}

export async function getUser({ storeId, userId }) {
  assertStoreId(storeId);
  const rows = await sql`
    SELECT
      u.id, u.email, u.full_name, u.is_active, u.last_login_at,
      u.created_at, u.updated_at, u.role_id,
      r.name AS role_name, r.permissions AS role_permissions
    FROM  users u
    JOIN  roles r ON r.id = u.role_id
    WHERE u.store_id = ${storeId}
      AND u.id       = ${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Creates a new user ("invites" them) with a hashed password.
 * In production you'd email them a magic invite link instead of setting
 * a password directly — but this is the foundational primitive.
 */
export async function createUser({
  storeId,
  email,
  password,
  fullName,
  roleId,
}) {
  assertStoreId(storeId);

  const errors = {};
  if (!email || typeof email !== "string") errors.email = "Email is required.";
  if (!password || password.length < 8)
    errors.password = "Password must be at least 8 characters.";
  if (!roleId || typeof roleId !== "string")
    errors.roleId = "Role is required.";

  if (Object.keys(errors).length) {
    const err = new Error("Validation failed.");
    err.code = "VALIDATION_ERROR";
    err.details = errors;
    throw err;
  }

  // Argon2id with hardened parameters
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 4,
  });

  try {
    const rows = await sql`
      INSERT INTO users (store_id, role_id, email, password_hash, full_name)
      VALUES (${storeId}, ${roleId}, ${email.toLowerCase().trim()}, ${passwordHash}, ${fullName ?? null})
      RETURNING id, email, full_name, role_id, is_active, created_at
    `;
    return rows[0];
  } catch (err) {
    if (err.code === "23505") {
      const e = new Error(
        "A user with this email already exists in this store.",
      );
      e.code = "CONFLICT";
      throw e;
    }
    throw err;
  }
}

export async function updateUser({ storeId, userId, updates }) {
  assertStoreId(storeId);
  const { fullName, roleId, isActive, password } = updates;

  const setClauses = [];
  const values = [];
  let idx = 1;

  if (fullName !== undefined) {
    setClauses.push(`full_name  = $${idx++}`);
    values.push(fullName);
  }
  if (roleId !== undefined) {
    setClauses.push(`role_id    = $${idx++}`);
    values.push(roleId);
  }
  if (isActive !== undefined) {
    setClauses.push(`is_active  = $${idx++}`);
    values.push(isActive);
  }

  if (password !== undefined) {
    if (password.length < 8) {
      const err = new Error("Password must be at least 8 characters.");
      err.code = "VALIDATION_ERROR";
      throw err;
    }
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    setClauses.push(`password_hash = $${idx++}`);
    values.push(hash);
  }

  if (setClauses.length === 0) return await getUser({ storeId, userId });

  setClauses.push("updated_at = NOW()");
  values.push(userId, storeId);

  const query = `
    UPDATE users
    SET    ${setClauses.join(", ")}
    WHERE  id       = $${idx}
      AND  store_id = $${idx + 1}
    RETURNING id, email, full_name, role_id, is_active, updated_at
  `;

  const rows = await sql(query, values);
  return rows[0] ?? null;
}

export async function deleteUser({ storeId, userId }) {
  assertStoreId(storeId);
  const rows = await sql`
    DELETE FROM users
    WHERE  id = ${userId} AND store_id = ${storeId}
    RETURNING id
  `;
  return rows.length > 0;
}

// ─── Role CRUD ────────────────────────────────────────────────────────────────

/**
 * Lists roles scoped to the tenant's store.
 * Roles with store_id = NULL are platform-level system roles visible to all.
 */
export async function listRoles({ storeId }) {
  assertStoreId(storeId);
  return sql`
    SELECT id, name, permissions, store_id, created_at
    FROM   roles
    WHERE  store_id = ${storeId}
       OR  store_id IS NULL
    ORDER BY created_at ASC
  `;
}

export async function createRole({ storeId, name, permissions = {} }) {
  assertStoreId(storeId);
  if (!name) {
    const err = new Error("Role name is required.");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  try {
    const rows = await sql`
      INSERT INTO roles (store_id, name, permissions)
      VALUES (${storeId}, ${name.trim()}, ${JSON.stringify(permissions)})
      RETURNING id, name, permissions, store_id, created_at
    `;
    return rows[0];
  } catch (err) {
    if (err.code === "23505") {
      const e = new Error(
        `A role named "${name}" already exists in this store.`,
      );
      e.code = "CONFLICT";
      throw e;
    }
    throw err;
  }
}

export async function updateRole({ storeId, roleId, updates }) {
  assertStoreId(storeId);
  const { name, permissions } = updates;
  const setClauses = [];
  const values = [];
  let idx = 1;

  if (name !== undefined) {
    setClauses.push(`name        = $${idx++}`);
    values.push(name.trim());
  }
  if (permissions !== undefined) {
    setClauses.push(`permissions = $${idx++}`);
    values.push(JSON.stringify(permissions));
  }

  if (setClauses.length === 0) {
    const rows = await sql`
      SELECT id, name, permissions, store_id, created_at
      FROM roles WHERE id = ${roleId} AND (store_id = ${storeId} OR store_id IS NULL)
    `;
    return rows[0] ?? null;
  }

  // Only allow updating roles that belong to this store (not system roles)
  values.push(roleId, storeId);
  const rows = await sql(
    `UPDATE roles
     SET    ${setClauses.join(", ")}
     WHERE  id       = $${idx}
       AND  store_id = $${idx + 1}
     RETURNING id, name, permissions, store_id, created_at`,
    values,
  );
  if (!rows[0]) {
    const err = new Error(
      "Role not found or is a system role that cannot be modified.",
    );
    err.code = "FORBIDDEN";
    throw err;
  }
  return rows[0];
}

export async function deleteRole({ storeId, roleId }) {
  assertStoreId(storeId);
  // Only permit deletion of roles belonging to this specific store
  const rows = await sql`
    SELECT name, store_id FROM roles WHERE id = ${roleId} LIMIT 1
  `;
  if (!rows[0]) return false;

  if (rows[0].store_id === null) {
    const err = new Error(
      `"${rows[0].name}" is a platform system role and cannot be deleted.`,
    );
    err.code = "FORBIDDEN";
    throw err;
  }

  if (rows[0].store_id !== storeId) {
    const err = new Error(
      "Access denied. This role does not belong to your store.",
    );
    err.code = "FORBIDDEN";
    throw err;
  }

  const deleted = await sql`
    DELETE FROM roles WHERE id = ${roleId} AND store_id = ${storeId} RETURNING id
  `;
  return deleted.length > 0;
}
