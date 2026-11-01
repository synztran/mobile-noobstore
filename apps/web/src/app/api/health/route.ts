import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
	const results: Record<string, unknown> = {};

	try {
		const supabase = await createClient();

		// 1. Check auth service is reachable
		const { error: authError } = await supabase.auth.getSession();
		results.auth = authError
			? { ok: false, error: authError.message }
			: { ok: true };

		// 2. Check each table exists and is accessible
		const tables = [
			"users",
			"categories",
			"products",
			"product_variants",
			"product_components",
			"carts",
			"cart_items",
			"orders",
			"order_items",
			"order_services",
			"services",
			"user_addresses",
		] as const;

		results.tables = {};
		// Parallel, not serial. These are 12 independent existence checks; the
		// serial `for` version stacked 12 sequential round-trips into every
		// health probe, which lengthened the function's lifetime and its
		// provisioned-memory cost for no benefit. Failure of one table still
		// resolves as its own entry rather than rejecting the batch.
		await Promise.all(
			tables.map(async (table) => {
				const { error, count } = await supabase
					.from(table)
					.select("*", { count: "exact", head: true });

				(results.tables as Record<string, unknown>)[table] = error
					? { ok: false, error: error.message, code: error.code }
					: { ok: true, rowCount: count };
			}),
		);

		const allTablesOk = Object.values(
			results.tables as Record<string, { ok: boolean }>,
		).every((t) => t.ok);

		return NextResponse.json(
			{
				status:
					results.auth &&
					(results.auth as { ok: boolean }).ok &&
					allTablesOk
						? "healthy"
						: "degraded",
				supabaseUrl:
					process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(not set)",
				...results,
			},
			{ status: 200 },
		);
	} catch (err) {
		return NextResponse.json(
			{
				status: "error",
				error: err instanceof Error ? err.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
