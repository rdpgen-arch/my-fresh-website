/**
 * GET /api/storefront/:slug/config
 *
 * Public — no JWT required.
 * Returns store name, theme_config, and active integrations (non-sensitive).
 * This is the first call the ThemeProvider makes to boot the storefront.
 */

import sql from "@/app/api/utils/sql";

export async function GET(_req, { params }) {
  const { slug } = await params;

  const storeRows = await sql`
    SELECT id, name, slug, theme_config, is_active
    FROM   stores
    WHERE  slug = ${slug}
    LIMIT  1
  `;
  const store = storeRows[0];

  if (!store) {
    return Response.json(
      { success: false, error: "Store not found." },
      { status: 404 },
    );
  }

  if (!store.is_active) {
    return Response.json(
      { success: false, error: "This store is unavailable." },
      { status: 403 },
    );
  }

  // Fetch active integrations (public config only — no credentials)
  const integrations = await sql`
    SELECT integration, public_config
    FROM   integration_configs
    WHERE  store_id  = ${store.id}
      AND  is_active = TRUE
      AND  category  = 'payment'
  `;

  // Return the active payment methods so checkout can render gateway buttons
  const activePaymentMethods = integrations.map((i) => ({
    id: i.integration,
    public_config: i.public_config,
  }));

  return Response.json({
    success: true,
    data: {
      storeId: store.id,
      name: store.name,
      slug: store.slug,
      themeConfig: store.theme_config,
      paymentMethods: activePaymentMethods,
    },
  });
}
