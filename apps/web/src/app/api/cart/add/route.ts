import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddToCartRequest {
	/** The assembled parent kit product ID */
	parent_product_id: string;
	/** Selected variant IDs for each component group */
	selected_variant_ids: string[];
}

export interface AddToCartResponse {
	cart_id: string;
	parent_cart_item_id: string;
}

// ─── POST /api/cart/add ────────────────────────────────────────────────────────
//
// Inserts the parent kit + all component variants as nested cart_items.
// The parent row is inserted first, then each variant row references it
// via parent_cart_item_id to keep the bundle together in the cart UI.

export async function POST(req: NextRequest) {
	try {
		const body: AddToCartRequest = await req.json();

		if (!body.parent_product_id) {
			return NextResponse.json(
				{ error: "parent_product_id is required" },
				{ status: 400 },
			);
		}

		const supabase = await createClient();

		// Get (or create an anonymous) cart for the current user session
		const {
			data: { user },
		} = await supabase.auth.getUser();

		let cartId: string;

		if (user) {
			// Look up existing cart for this user
			const { data: existingCart } = await supabase
				.from("carts")
				.select("id")
				.eq("user_id", user.id)
				.maybeSingle();

			if (existingCart) {
				cartId = existingCart.id;
			} else {
				const newCartId = crypto.randomUUID();
				const { error: cartError } = await supabase
					.from("carts")
					.insert({ id: newCartId, user_id: user.id });
				if (cartError) {
					return NextResponse.json(
						{ error: cartError.message },
						{ status: 500 },
					);
				}
				cartId = newCartId;
			}
		} else {
			// Guest cart — create a new one every session (client tracks cart_id via cookie)
			const cartCookie =
				req.cookies.get("noobstore-cart-id")?.value ?? null;
			if (cartCookie) {
				// Verify it exists in DB
				const { data: existingCart } = await supabase
					.from("carts")
					.select("id")
					.eq("id", cartCookie)
					.maybeSingle();
				if (existingCart) {
					cartId = existingCart.id;
				} else {
					cartId = crypto.randomUUID();
					await supabase
						.from("carts")
						.insert({ id: cartId, user_id: null });
				}
			} else {
				cartId = crypto.randomUUID();
				await supabase
					.from("carts")
					.insert({ id: cartId, user_id: null });
			}
		}

		// Insert parent kit as the top-level cart item
		const parentCartItemId = crypto.randomUUID();
		const { error: parentError } = await supabase
			.from("cart_items")
			.insert({
				id: parentCartItemId,
				cart_id: cartId,
				product_id: body.parent_product_id,
				variant_id: null,
				quantity: 1,
				parent_cart_item_id: null,
			});

		if (parentError) {
			return NextResponse.json(
				{ error: parentError.message },
				{ status: 500 },
			);
		}

		// Insert each selected variant as a child row referencing the parent
		if (body.selected_variant_ids.length > 0) {
			const variantRows = body.selected_variant_ids.map((variantId) => ({
				id: crypto.randomUUID(),
				cart_id: cartId,
				product_id: body.parent_product_id,
				variant_id: variantId,
				quantity: 1,
				parent_cart_item_id: parentCartItemId,
			}));

			const { error: variantsError } = await supabase
				.from("cart_items")
				.insert(variantRows);

			if (variantsError) {
				console.error(
					"[cart/add] variants insert error:",
					variantsError,
				);
				// Non-fatal — parent item exists; log and continue
			}
		}

		const response = NextResponse.json<AddToCartResponse>({
			cart_id: cartId,
			parent_cart_item_id: parentCartItemId,
		});

		// Persist guest cart ID in a short-lived cookie
		if (!user) {
			response.cookies.set("noobstore-cart-id", cartId, {
				httpOnly: true,
				sameSite: "lax",
				maxAge: 60 * 60 * 24 * 30, // 30 days
				path: "/",
			});
		}

		return response;
	} catch (err) {
		console.error("[cart/add] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
