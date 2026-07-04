/**
 * bKash Return URL Handler
 *
 * After the customer completes (or cancels) payment on bKash's hosted page,
 * bKash redirects back to this URL with ?paymentID=xxx&status=success|cancel|failure
 *
 * This route executes the "execute payment" step, updates the order, and
 * redirects the customer to the appropriate storefront page.
 */
import {
  getDecryptedCredentials,
  logIPNEvent,
} from "@/app/api/services/integration.service";
import sql from "@/app/api/utils/sql";

const BKASH_BASE_LIVE = "https://tokenized.pay.bka.sh/v1.2.0-beta";
const BKASH_BASE_SANDBOX = "https://tokenized.sandbox.pay.bka.sh/v1.2.0-beta";

async function grantBKashToken(base, creds) {
  const res = await fetch(`${base}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: creds.username,
      password: creds.password,
    },
    body: JSON.stringify({
      app_key: creds.app_key,
      app_secret: creds.app_secret,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.id_token)
    throw new Error("Token grant failed: " + JSON.stringify(data));
  return data.id_token;
}

export async function GET(request) {
  const url = new URL(request.url);
  const paymentID = url.searchParams.get("paymentID");
  const status = url.searchParams.get("status"); // "success" | "cancel" | "failure"
  const appUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || "";

  // On cancel or failure, find the order and redirect to its page
  if (status === "cancel" || status === "failure") {
    // Best-effort: find order by paymentID stored in payment_meta
    try {
      const rows = await sql`
        SELECT o.id, o.order_number, s.slug
        FROM orders o
        JOIN stores s ON s.id = o.store_id
        WHERE o.payment_meta->>'paymentID' = ${paymentID}
        LIMIT 1
      `;
      if (rows[0]) {
        const { slug, order_number } = rows[0];
        const redirectUrl = `${appUrl}/${slug}/order/${order_number}?payment=${status}`;
        return Response.redirect(redirectUrl, 302);
      }
    } catch (_) {}
    return Response.redirect(`${appUrl}?payment=${status}`, 302);
  }

  // status === "success" — execute the payment
  if (!paymentID) {
    return Response.redirect(`${appUrl}?payment=failure`, 302);
  }

  let storeId, orderNumber, slug;
  try {
    // Find order by paymentID in payment_meta
    const rows = await sql`
      SELECT o.id, o.order_number, o.store_id, o.status, o.payment_meta, s.slug
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.payment_meta->>'paymentID' = ${paymentID}
      LIMIT 1
    `;

    if (!rows[0]) {
      return Response.redirect(
        `${appUrl}?payment=failure&reason=order_not_found`,
        302,
      );
    }

    const order = rows[0];
    storeId = order.store_id;
    orderNumber = order.order_number;
    slug = order.slug;

    // Get bKash credentials for this store
    const creds = await getDecryptedCredentials({
      storeId,
      integration: "bkash",
    });
    if (!creds) throw new Error("bKash not configured for this store");

    const base = creds.sandbox ? BKASH_BASE_SANDBOX : BKASH_BASE_LIVE;
    const token = await grantBKashToken(base, creds);

    // Execute the payment
    const execRes = await fetch(`${base}/tokenized/checkout/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        authorization: token,
        "x-app-key": creds.app_key,
      },
      body: JSON.stringify({ paymentID }),
    });
    const execData = await execRes.json();

    await logIPNEvent({
      storeId,
      integration: "bkash",
      rawPayload: execData,
      verified: execData.statusCode === "0000",
      orderNumber,
      actionTaken:
        execData.statusCode === "0000" ? "payment_executed" : "execute_failed",
      errorMessage:
        execData.statusCode !== "0000" ? execData.statusMessage : null,
    });

    if (
      execData.statusCode !== "0000" ||
      execData.transactionStatus !== "Completed"
    ) {
      const redirectUrl = `${appUrl}/${slug}/order/${orderNumber}?payment=failure`;
      return Response.redirect(redirectUrl, 302);
    }

    // Update order payment status
    await sql`
      UPDATE orders SET
        payment_status = 'paid',
        payment_meta   = payment_meta || ${JSON.stringify({
          paymentID,
          trxID: execData.trxID,
          transactionStatus: execData.transactionStatus,
          executedAt: new Date().toISOString(),
        })}::jsonb,
        updated_at = NOW()
      WHERE id = (
        SELECT id FROM orders WHERE payment_meta->>'paymentID' = ${paymentID} LIMIT 1
      )
    `;

    // Transition order to processing if still pending
    await sql`
      UPDATE orders SET status = 'processing', updated_at = NOW()
      WHERE payment_meta->>'paymentID' = ${paymentID}
        AND status = 'pending'
    `;

    const redirectUrl = `${appUrl}/${slug}/order/${orderNumber}?payment=success`;
    return Response.redirect(redirectUrl, 302);
  } catch (err) {
    console.error("[bKash return]", err);
    await logIPNEvent({
      storeId: storeId ?? null,
      integration: "bkash",
      rawPayload: { paymentID, status, error: err.message },
      verified: false,
      orderNumber: orderNumber ?? null,
      actionTaken: "error",
      errorMessage: err.message,
    }).catch(() => {});

    const fallback =
      slug && orderNumber
        ? `${appUrl}/${slug}/order/${orderNumber}?payment=error`
        : `${appUrl}?payment=error`;
    return Response.redirect(fallback, 302);
  }
}
