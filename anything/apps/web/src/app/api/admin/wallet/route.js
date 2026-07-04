/**
 * Task 3C: Wallet API
 *
 * GET  /api/admin/wallet          — Get store wallet balance + recent ledger
 * POST /api/admin/wallet/withdraw — Request a withdrawal
 */

import sql from "@/app/api/utils/sql";
import { withTenant } from "@/app/api/middleware/withTenant";
import { apiResponse } from "@/app/api/utils/response";

async function getHandler(request, ctx) {
  const { storeId } = ctx;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));

  // Ensure wallet row exists
  await sql`
    INSERT INTO wallets (store_id) VALUES (${storeId})
    ON CONFLICT (store_id) DO NOTHING
  `;

  const [walletRows, ledger, pendingWithdrawals] = await sql.transaction([
    sql`SELECT balance, hold_amount, updated_at FROM wallets WHERE store_id = ${storeId}`,
    sql`
      SELECT id, txn_type, amount, balance_after, note, order_id, created_at
      FROM wallet_ledger
      WHERE store_id = ${storeId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `,
    sql`
      SELECT id, amount, status, bank_details, created_at
      FROM withdrawal_requests
      WHERE store_id = ${storeId} AND status = 'pending'
      ORDER BY created_at DESC
    `,
  ]);

  const wallet = walletRows[0] ?? { balance: 0, hold_amount: 0 };

  return apiResponse.ok({ wallet, ledger, pendingWithdrawals });
}

export const GET = (req, ctx) => withTenant(getHandler)(req, ctx);
