/**
 * Pathao Location Lookup
 * GET /api/courier/pathao/locations?type=cities
 * GET /api/courier/pathao/locations?type=zones&cityId=1
 * GET /api/courier/pathao/locations?type=areas&zoneId=1
 *
 * Used by the admin order detail to populate dropdowns before booking.
 */
import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { getDecryptedCredentials } from "@/app/api/services/integration.service";
import {
  getPathaoCities,
  getPathaoZones,
  getPathaoAreas,
} from "@/app/api/services/pathao.service";
import { apiResponse } from "@/app/api/utils/response";

async function handler(request, context, tenant) {
  const { storeId } = tenant;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const cityId = url.searchParams.get("cityId");
  const zoneId = url.searchParams.get("zoneId");

  const creds = await getDecryptedCredentials({
    storeId,
    integration: "pathao",
  });
  if (!creds || !creds.is_active) {
    return apiResponse.badRequest("Pathao is not configured for this store");
  }

  try {
    if (type === "cities") {
      const cities = await getPathaoCities(storeId, creds);
      return apiResponse.ok(cities);
    }
    if (type === "zones" && cityId) {
      const zones = await getPathaoZones(storeId, creds, cityId);
      return apiResponse.ok(zones);
    }
    if (type === "areas" && zoneId) {
      const areas = await getPathaoAreas(storeId, creds, zoneId);
      return apiResponse.ok(areas);
    }
    return apiResponse.badRequest(
      "Invalid type parameter. Use: cities, zones, areas",
    );
  } catch (err) {
    console.error("[Pathao locations]", err);
    return apiResponse.internalError(err.message);
  }
}

export const GET = (req, ctx) =>
  withTenant(
    withRole("orders:read", (req2, ctx2, tenant) =>
      handler(req2, ctx2, tenant),
    ),
  )(req, ctx);
