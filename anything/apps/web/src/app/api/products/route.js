/**
 * POST /api/products  — Create a new product
 * GET  /api/products  — List products for the current tenant
 *
 * Protected by withTenant → withRole:
 *   GET  requires "products:read"
 *   POST requires "products:write"
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import {
  listProducts,
  createProduct,
} from "@/app/api/services/product.service";
import { apiResponse } from "@/app/api/utils/response";

// ─── GET /api/products ────────────────────────────────────────────────────────

export const GET = withTenant(
  withRole("products:read", async (request, _routeCtx, tenant) => {
    const { searchParams } = new URL(request.url);

    const result = await listProducts({
      storeId: tenant.storeId,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 50,
      sortBy: searchParams.get("sortBy") ?? "created_at",
      sortDir: searchParams.get("sortDir") ?? "desc",
    });

    return apiResponse.ok(result.products, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: Math.ceil(result.total / result.limit),
    });
  }),
);

// ─── POST /api/products ───────────────────────────────────────────────────────

export const POST = withTenant(
  withRole("products:write", async (request, _routeCtx, tenant) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Request body must be valid JSON.");
    }

    try {
      const product = await createProduct({
        storeId: tenant.storeId,
        sku: body.sku,
        name: body.name,
        description: body.description,
        price: body.price,
        currency: body.currency,
        stockQuantity: body.stockQuantity ?? body.stock_quantity,
        dynamicAttributes:
          body.dynamicAttributes ?? body.dynamic_attributes ?? {},
        status: body.status ?? "draft",
        imageUrl: body.imageUrl ?? body.image_url ?? null,
      });
      return apiResponse.created(product);
    } catch (err) {
      if (err.code === "VALIDATION_ERROR")
        return apiResponse.badRequest("Validation failed.", err.details);
      if (err.code === "23505")
        return apiResponse.conflict(
          `A product with SKU "${body.sku}" already exists in this store.`,
        );
      console.error("[POST /api/products]", err);
      return apiResponse.internalError("Failed to create product.");
    }
  }),
);
