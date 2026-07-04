/**
 * GET    /api/products/:productId  — Fetch single product
 * PATCH  /api/products/:productId  — Partial update
 * DELETE /api/products/:productId  — Delete product
 *
 * The store_id boundary is enforced at the service layer —
 * a tenant can never read, modify, or delete another tenant's product.
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import {
  getProduct,
  updateProduct,
  deleteProduct,
} from "@/app/api/services/product.service";
import { apiResponse } from "@/app/api/utils/response";

// ─── GET /api/products/:productId ─────────────────────────────────────────────

export const GET = withTenant(async (_request, { params }, tenant) => {
  const { productId } = await params;
  const product = await getProduct({ storeId: tenant.storeId, productId });

  if (!product) {
    return apiResponse.notFound(
      `Product "${productId}" not found in this store.`,
    );
  }

  return apiResponse.ok(product);
});

// ─── PATCH /api/products/:productId ──────────────────────────────────────────

export const PATCH = withTenant(async (request, { params }, tenant) => {
  const { productId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Request body must be valid JSON.");
  }

  if (!body || Object.keys(body).length === 0) {
    return apiResponse.badRequest(
      "Request body is empty. Provide at least one field to update.",
    );
  }

  try {
    const updated = await updateProduct({
      storeId: tenant.storeId,
      productId,
      updates: body,
    });

    if (!updated) {
      return apiResponse.notFound(
        `Product "${productId}" not found in this store.`,
      );
    }

    return apiResponse.ok(updated);
  } catch (err) {
    if (err.code === "23505") {
      return apiResponse.conflict(
        "A product with this SKU already exists in this store.",
      );
    }
    console.error("[PATCH /api/products/:productId]", err);
    return apiResponse.internalError("Failed to update product.");
  }
});

// ─── DELETE /api/products/:productId ─────────────────────────────────────────

export const DELETE = withTenant(async (_request, { params }, tenant) => {
  const { productId } = await params;
  const deleted = await deleteProduct({ storeId: tenant.storeId, productId });

  if (!deleted) {
    return apiResponse.notFound(
      `Product "${productId}" not found in this store.`,
    );
  }

  return apiResponse.noContent();
});
