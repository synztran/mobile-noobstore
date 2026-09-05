import { MaxLimitExceededError, removeCartItem, StockExceededError, updateCartItemQuantity } from "@/modules/cart/server/service";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Defense-in-depth: verifies the caller may mutate this cart item before any
 * write happens, instead of relying solely on RLS.
 *
 * Mirrors the cart RLS policies:
 *   - signed-in user  → item's parent cart must belong to them
 *   - anonymous guest → item's parent cart must be a guest cart (user_id NULL)
 */
async function assertCartAccess(
	supabase: Awaited<ReturnType<typeof createClient>>,
	itemId: string,
): Promise<boolean> {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { data: item } = await supabase
		.from("cart_items")
		.select("cart_id, carts(user_id)")
		.eq("id", itemId)
		.maybeSingle();

	if (!item) return false;

	// Nested relation shape varies (object | array) depending on FK inference.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const ownerUserId: string | null = Array.isArray(item.carts)
		? // eslint-disable-next-line @typescript-eslint/no-explicit-any
		  ((item.carts as any)[0]?.user_id ?? null)
		: // eslint-disable-next-line @typescript-eslint/no-explicit-any
		  ((item.carts as any)?.user_id ?? null);

	return user ? ownerUserId === user.id : ownerUserId === null;
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		if (!id) {
			return NextResponse.json({ error: "Item id required" }, { status: 400 });
		}

		const body = await req.json();
		const quantity = Number(body.quantity);

		if (!Number.isFinite(quantity) || quantity < 1) {
			return NextResponse.json(
				{ error: "quantity must be a positive number" },
				{ status: 400 },
			);
		}

		const supabase = await createClient();
		if (!(await assertCartAccess(supabase, id))) {
			return NextResponse.json({ error: "Item not found" }, { status: 404 });
		}

		await updateCartItemQuantity(supabase, id, quantity);

		return NextResponse.json({ success: true });
	} catch (err) {
		if (err instanceof StockExceededError) {
			return NextResponse.json(
				{ error: err.message, available: err.available },
				{ status: 409 },
			);
		}
    if (err instanceof MaxLimitExceededError) {
      return NextResponse.json(
        { error: err.message, max: err.max},
        { status: 409 },
      )
    }
		console.error("[cart/items/PATCH] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		if (!id) {
			return NextResponse.json({ error: "Item id required" }, { status: 400 });
		}

		const supabase = await createClient();
		if (!(await assertCartAccess(supabase, id))) {
			return NextResponse.json({ error: "Item not found" }, { status: 404 });
		}

		await removeCartItem(supabase, id);

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[cart/items/DELETE] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
