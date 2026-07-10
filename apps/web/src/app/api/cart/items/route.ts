import {
	getOrCreateCart,
	upsertCartItem,
	type UpsertCartInput,
} from "@/lib/cart-service";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface AddCartItemRequest extends UpsertCartInput {}

export interface AddCartItemResponse {
	cart_id: string;
	item_id: string;
}

export async function POST(req: NextRequest) {
	try {
		const body: AddCartItemRequest = await req.json();

		if (!body.product_id) {
			return NextResponse.json(
				{ error: "product_id is required" },
				{ status: 400 },
			);
		}

		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Vui lòng đăng nhập để thêm vào giỏ hàng" },
				{ status: 401 },
			);
		}

		const { cartId } = await getOrCreateCart(supabase, {
			userId: user.id,
		});

		const { parentItemId } = await upsertCartItem(supabase, cartId, body);

		return NextResponse.json<AddCartItemResponse>({
			cart_id: cartId,
			item_id: parentItemId,
		});
	} catch (err) {
		console.error("[cart/items/POST] error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
