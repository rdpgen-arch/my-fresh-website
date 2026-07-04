/**
 * POST /api/admin/wallet/withdraw
 * Create a withdrawal request (pending approval by superadmin)
 *
 * Body: { amount, bankDetails: { bankName, accountNumber, accountName, routingNumber } }
 */

import sql from "@/app/api/utils/sql";
import { withTenant } from "@/app/api/middleware/withTenant";
import { apiResponse } from "@/app/api/utils/response";

// Task 5A: Withdrawal limits
const MIN_WITHDRAWAL = 500; // BDT minimum
const MAX_WITHDRAWAL = 50000; // BDT max per request

async function handler(request, ctx) {
  const { storeId } = ctx;
  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON.");
  }

  const { amount, bankDetails = {} } = body;
  const numAmount = Number(amount);

  if (!numAmount || numAmount < MIN_WITHDRAWAL) {
    return apiResponse.badRequest(`Minimum withdrawal is ৳${MIN_WITHDRAWAL}.`);
  }
  if (numAmount > MAX_WITHDRAWAL) {
    return apiResponse.badRequest(
      `Maximum withdrawal per request is ৳${MAX_WITHDRAWAL}.`,
    );
  }

  // Check wallet balance
  const wallets =
    await sql`SELECT balance, hold_amount FROM wallets WHERE store_id = ${storeId}`;
  if (!wallets[0]) return apiResponse.badRequest("Wallet not found.");

  const available = Number(wallets[0].balance) - Number(wallets[0].hold_amount);
  if (numAmount > available) {
    return apiResponse.badRequest(
      `Insufficient available balance. Available: ৳${available.toFixed(2)}.`,
    );
  }

  // Check for pending withdrawal
  const pending = await sql`
    SELECT id FROM withdrawal_requests
    WHERE store_id = ${storeId} AND status = 'pending' LIMIT 1
  `;
  if (pending[0]) {
    return apiResponse.badRequest(
      "You already have a pending withdrawal request. Please wait for it to be processed.",
    );
  }

  // Create withdrawal request + hold the amount
  const [wr] = await sql`
    INSERT INTO withdrawal_requests (store_id, amount, bank_details)
    VALUES (${storeId}, ${numAmount}, ${JSON.stringify(bankDetails)})
    RETURNING id, amount, status, created_at
  `;

  // Put a hold on the wallet
  await sql`
    UPDATE wallets
    SET hold_amount = hold_amount + ${numAmount}, updated_at = now()
    WHERE store_id = ${storeId}
  `;

  return apiResponse.ok({ withdrawal: wr });
}

export const POST = (req, ctx) => withTenant(handler)(req, ctx);
