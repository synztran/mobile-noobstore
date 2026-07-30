import { MaxLimitExceededError, removeCartItem, StockExceededError, updateCartItemQuantity } from "@/lib/cart-service";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
