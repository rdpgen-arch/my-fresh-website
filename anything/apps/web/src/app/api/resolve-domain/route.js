/**
 * GET /api/resolve-domain?host=shop.brand.com
 *
 * Resolves a custom domain → store slug.
 * Called by the root page on load to enable seamless custom-domain routing.
 */

import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const host = (searchParams.get("host") ?? "").toLowerCase().split(":")[0];

  if (!host) {
    return apiResponse.badRequest("Missing `host` query param.");
  }

  try {
    const rows = await sql`
      SELECT slug
      FROM   stores
      WHERE  custom_domain = ${host}
        AND  is_active = true
      LIMIT  1
    `;

    if (!rows.length) {
      return apiResponse.notFound("No active store found for this domain.");
    }

    return apiResponse.success({ slug: rows[0].slug });
  } catch (err) {
    console.error("[resolve-domain]", err);
    return apiResponse.internalError("Domain resolution failed.");
  }
}
