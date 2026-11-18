import type { Database } from "@db-types";

/**
 * Shared voucher types for the admin app.
 *
 * These are DERIVED from the generated Supabase types rather than hand-written
 * unions. The voucher components previously each declared their own local copy
 * of `VoucherRow` / `VoucherScopeType` / `VoucherRewardType` / `VoucherStatus`,
 * which silently drifted: `auto_apply` (added in migration 128) reached the
 * database but was missing from every local type AND from the vouchers page
 * SELECT list, so the edit modal could never read it back.
 *
 * Two properties matter here:
 *
 *  1. The scalar unions come from `Database["public"]["Enums"]`, so a new
 *     Postgres enum value can never disagree with the TypeScript union.
 *
 *  2. `AdminVoucher` is a `Pick` of the vouchers Row, and `Pick` makes every
 *     listed key REQUIRED. The vouchers page selects exactly these columns, so
 *     dropping one from the SELECT is a compile error rather than a field that
 *     silently arrives as `undefined`. Do not make these keys optional.
 *
 * `creator` / `applied_orders` come from PostgREST embeds. Their exact inferred
 * shape depends on how the server resolves reverse relations, so they stay
 * hand-described here; the scalar columns above are the part that is enforced.
 */

export type VoucherRewardType =
  Database["public"]["Enums"]["voucher_reward_type"];

export type VoucherScopeType = Database["public"]["Enums"]["voucher_scope_type"];

export type VoucherStatus = Database["public"]["Enums"]["voucher_status"];

type VoucherDbRow = Database["public"]["Tables"]["vouchers"]["Row"];

type AdminUserRef = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

export type AdminVoucherAppliedOrder = {
  id: string;
  order_number: string;
  status: string;
  total_price: number;
  created_at: string | null;
  user_id: string | null;
  customer?: AdminUserRef | null;
};

/**
 * A vouchers row as the admin list page loads it: the columns below are
 * selected explicitly, plus the two PostgREST embeds. Keep this list in sync
 * with the `.select(...)` in `app/(admin)/vouchers/page.tsx` — the compiler
 * will tell you when they diverge.
 */
export type AdminVoucher = Pick<
  VoucherDbRow,
  | "id"
  | "name"
  | "code"
  | "description"
  | "reward_type"
  | "scope_type"
  | "percent_off"
  | "amount_off"
  | "usage_limit_total"
  | "usage_limit_per_user"
  | "min_order_amount"
  | "stackable"
  | "auto_apply"
  | "applies_to_product_ids"
  | "applies_to_category_slugs"
  | "excluded_product_ids"
  | "applies_to_shipping_methods"
  | "customer_ids"
  | "start_at"
  | "end_at"
  | "used_count"
  | "status"
  | "created_at"
  | "created_by"
> & {
  creator?: AdminUserRef | null;
  applied_orders?: AdminVoucherAppliedOrder[];
};
