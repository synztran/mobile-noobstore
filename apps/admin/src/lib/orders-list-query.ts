import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Single source of truth for the admin orders LIST query.
 *
 * The list is read from two places: the server component on first paint, and
 * `/api/orders` on every 30s poll. Those two used to carry independent copies
 * of the same select + filter + pagination logic, and they had already drifted
 * — the polling path was missing `cancelled_at` / `cancelled_note`, so a
 * cancellation note rendered on first paint then vanished after the first
 * refresh. Anything that changes what the list returns belongs here.
 */

export const ORDERS_PAGE_SIZE = 20;

/**
 * The signed-in staff member's own email address.
 *
 * Staff test the real checkout flow with their own account, so their orders are
 * not real business. Resolving this per-request (rather than hardcoding an
 * address) means every staff account gets its own test orders hidden, and
 * nothing has to be updated when accounts are added or removed.
 *
 * Must go through the SSR client: the service-role client carries no session,
 * so `getUser()` on it always returns null.
 */
async function getCurrentAdminEmail(): Promise<string | null> {
	try {
		const ssr = await createServerClient();
		const {
			data: { user },
		} = await ssr.auth.getUser();
		return user?.email ?? null;
	} catch (err) {
		console.error(
			"[orders] failed to resolve current admin email:",
			err,
		);
		return null;
	}
}

/**
 * Builds the PostgREST logic tree that keeps guest orders and real customer
 * orders while dropping the staff test account's own orders.
 *
 * Deliberately uses only plain comparison operators. The obvious spelling —
 * `or=(user_id.is.null,not.user_id.in.(uuid))` — is rejected by PostgREST with
 * "failed to parse logic tree": a `not.` prefix is not a valid branch inside an
 * `or` group. Chaining `neq` instead keeps every branch parseable:
 *
 *   1 id  → or=(user_id.is.null,user_id.neq.<uuid>)
 *   n ids → or=(user_id.is.null,and(user_id.neq.a,user_id.neq.b))
 *
 * The `user_id.is.null` arm is not optional. Every one of these operators
 * yields NULL for a guest order, and no WHERE clause keeps NULL — so a bare
 * `user_id.neq.<uuid>` would silently drop every guest order from the list.
 */
function buildHideTestFilter(testIds: string[]): string {
	const notTest = testIds.map((id) => `user_id.neq.${id}`);

	return `user_id.is.null,${
		notTest.length === 1
			? notTest[0]
			: `and(${notTest.join(",")})`
	}`;
}

/**
 * Columns the orders table renders. `users` / `order_items` / `order_services`
 * are embedded counts used for the customer name and the M/S/P order-type chip;
 * the payment columns drive the deposit column and the CSV export.
 */
export const ORDER_LIST_SELECT =
	"id, order_number, status, total_price, created_at, cancelled_at, cancelled_note, is_quick_order, payment_type, deposit_percentage, deposit_amount, remaining_amount, deposit_paid_at, paid_at, refunded_at, users(first_name, last_name), order_items(count), order_services(count)";

export interface OrderListRow {
	id: string;
	order_number: string;
	status: string;
	is_quick_order: boolean;
	total_price: number;
	created_at: string | null;
	cancelled_at: string | null;
	cancelled_note: string | null;
	payment_type: string;
	deposit_percentage: number | null;
	deposit_amount: number | null;
	remaining_amount: number | null;
	deposit_paid_at: string | null;
	paid_at: string | null;
	refunded_at: string | null;
	/**
	 * Denormalised here rather than in the client: the rule spans two tables, so
	 * deriving it once server-side keeps the table cell and the CSV export from
	 * needing to know the shape.
	 */
	has_pre_order: boolean;
	/** Pre-order lines + pre-order kit components. Only meaningful with the flag. */
	pre_order_count: number;
	users: { first_name: string | null; last_name: string | null } | null;
	order_items: Array<{ count: number | null }> | null;
	order_services: Array<{ count: number | null }> | null;
}

/**
 * How many pre-order lines each of the given orders has.
 *
 * Pre-order is recorded at TWO levels and an order counts if EITHER is set:
 * `order_items.is_pre_order` for a whole line, and
 * `order_item_components.is_pre_order` when a component inside a kit is
 * pre-order. OrderItemsList (:76-78) and OrderActionBar's pre-order advance
 * button already assume both — a component-only pre-order is the common case for
 * kits, so checking `order_items` alone would miss most of them.
 *
 * `order_item_components.order_id` is populated by submit_order (migration
 * 143), so this needs no join back through `order_items`.
 *
 * Both queries filter on `is_pre_order = true` and select only `order_id`, so
 * each returns a handful of rows rather than every line of every order.
 */
async function fetchPreOrderCounts(
	supabase: ReturnType<typeof getAdminClient>,
	orderIds: string[]
): Promise<Map<string, number>> {
	const counts = new Map<string, number>();

	if (orderIds.length === 0) return counts;

	const [directItems, kitComponents] = await Promise.all([
		supabase
			.from("order_items")
			.select("order_id")
			.in("order_id", orderIds)
			.eq("is_pre_order", true),
		supabase
			.from("order_item_components")
			.select("order_id")
			.in("order_id", orderIds)
			.eq("is_pre_order", true),
	]);

	// Fails soft on purpose. This is one icon in one column; losing the order
	// queue because a lookup hiccuped would be a far worse trade.
	for (const result of [directItems, kitComponents]) {
		if (result.error) {
			console.error(
				`[orders] pre-order lookup failed (${result.error.message}); ` +
					"orders will show without the pre-order marker",
			);
			return new Map();
		}
		for (const row of result.data ?? []) {
			if (!row.order_id) continue;
			counts.set(row.order_id, (counts.get(row.order_id) ?? 0) + 1);
		}
	}

	return counts;
}

export interface OrdersListParams {
	q?: string;
	/** "order" (default) matches order_number; "customer" matches user names. */
	by?: string;
	page?: number;
	/** Exclude orders placed by staff accounts. */
	hideTest?: boolean;
}

export type OrdersListResult =
	| {
			/**
		   * A customer-name search matched no user at all, so there is nothing
		   * to query. Distinct from "matched users but zero orders", which
		   * returns `ok: true` with an empty list.
		   */
			ok: false;
			reason: "no-match";
	  }
	| {
			ok: true;
			orders: OrderListRow[];
			count: number | null;
			/** Server-owned so the client never re-derives it from a stale count. */
			totalPages: number;
			/** Non-null on query failure; callers decide whether to surface it. */
			error: { message: string } | null;
	  };

export async function fetchOrdersList({
	q = "",
	by = "order",
	page = 1,
	hideTest = false,
}: OrdersListParams = {}): Promise<OrdersListResult> {
	const supabase = getAdminClient();
	const currentPage = Math.max(1, page);

	const baseQuery = () =>
		supabase
			.from("orders")
			.select(ORDER_LIST_SELECT, { count: "exact" })
			.order("created_at", { ascending: false })
			.range(
				(currentPage - 1) * ORDERS_PAGE_SIZE,
				currentPage * ORDERS_PAGE_SIZE - 1,
			);

	// Resolved separately from the query so it can be dropped and retried if
	// PostgREST rejects the logic tree.
	let hideTestFilter: string | null = null;

	if (hideTest) {
		const email = await getCurrentAdminEmail();
		if (email) {
			const { data: testUsers } = await supabase
				.from("users")
				.select("id")
				// ILIKE with no wildcard is case-insensitive equality. A plain
				// `eq` would silently match nothing if the stored address were
				// capitalised, and the switch would look broken rather than off.
				.ilike("email", email);
			const testIds = (testUsers ?? []).map((u) => u.id);
			if (testIds.length > 0) {
				hideTestFilter = buildHideTestFilter(testIds);
			}
		} else {
			// Fail open: if we cannot identify the viewer we must not risk
			// hiding real orders. Showing everything is the safe direction.
			console.warn(
				"[orders] hideTest requested but the current admin email could not be resolved; filter skipped",
			);
		}
	}

	let query = baseQuery();
	if (hideTestFilter) {
		// Applied before the count is resolved so the total matches what is shown.
		query = query.or(hideTestFilter);
	}

	if (q) {
		if (by === "customer") {
			// Known limitation: the term is interpolated into PostgREST's `or`
			// grammar, so a name containing a comma or a dot splits the filter.
			// Pre-existing; escaping it would change search behaviour, so it is
			// left alone here rather than changed silently alongside the fix.
			const { data: users } = await supabase
				.from("users")
				.select("id")
				.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
			const ids = (users ?? []).map((u) => u.id);
			if (ids.length === 0) {
				return { ok: false, reason: "no-match" };
			}
			query = query.in("user_id", ids);
		} else {
			query = query.ilike("order_number", `%${q}%`);
		}
	}

	let { data, count, error } = await query;

	// The hide-test filter is a display convenience, never a correctness
	// requirement. If PostgREST refuses the logic tree, fall back to the
	// unfiltered list so staff can still see and work the queue.
	if (error && hideTestFilter) {
		console.error(
			`[orders] hide-test filter rejected (${error.message}); retrying without it`,
		);

		let fallback = baseQuery();
		if (q) {
			if (by === "customer") {
				const { data: users } = await supabase
					.from("users")
					.select("id")
					.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
				fallback = fallback.in(
					"user_id",
					(users ?? []).map((u) => u.id),
				);
			} else {
				fallback = fallback.ilike("order_number", `%${q}%`);
			}
		}
		({ data, count, error } = await fallback);
	}

	return {
		ok: true,
		orders: await withPreOrderFlags(
			supabase,
			(data ?? []) as unknown as OrderListRow[],
		),
		count: count ?? null,
		totalPages: Math.max(1, Math.ceil((count ?? 0) / ORDERS_PAGE_SIZE)),
		error: error ? { message: error.message } : null,
	};
}

/**
 * Stamp `has_pre_order` onto the rows of a single page.
 *
 * Runs after `data` is final (including after the hide-test fallback retry), so
 * the pre-order lookups fire exactly once per fetch and never interfere with
 * `count` or the pagination range.
 */
async function withPreOrderFlags(
	supabase: ReturnType<typeof getAdminClient>,
	orders: OrderListRow[]
): Promise<OrderListRow[]> {
	const counts = await fetchPreOrderCounts(
		supabase,
		orders.map((o) => o.id),
	);

	return orders.map((order) => {
		const preOrderCount = counts.get(order.id) ?? 0;
		return {
			...order,
			has_pre_order: preOrderCount > 0,
			pre_order_count: preOrderCount,
		};
	});
}
