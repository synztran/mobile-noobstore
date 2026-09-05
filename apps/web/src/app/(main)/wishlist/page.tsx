import WishlistPage from "@/modules/user/ui/wishlist/WishlistPage";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type WishlistRow = {
	id: string;
	product_id: string;
	added_at: string;
	products: {
		id: string;
		name: string;
		slug: string;
		base_price: number;
		thumbnail: string | null;
		stock_quantity: number | null;
		brand: string | null;
	} | null;
};

export default async function WishlistRoutePage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const { data } = await (
		supabase.from as unknown as (table: string) => {
			select: (columns: string) => {
				eq: (
					column: string,
					value: string,
				) => {
					order: (
						column: string,
						options: { ascending: boolean },
					) => Promise<{
						data: WishlistRow[] | null;
						error: { message: string } | null;
					}>;
				};
			};
		}
	)("wishlists")
		.select(
			"id, product_id, added_at, products(id, name, slug, base_price, thumbnail, stock_quantity, brand)",
		)
		.eq("user_id", user.id)
		.order("added_at", { ascending: false });

	const initialItems = (data ?? []).map((row) => ({
		id: row.id,
		product_id: row.product_id,
		added_at: row.added_at,
		product: row.products
			? {
					id: row.products.id,
					name: row.products.name,
					slug: row.products.slug,
					base_price: Number(row.products.base_price),
					thumbnail: row.products.thumbnail,
					stock_quantity: row.products.stock_quantity,
					brand: row.products.brand,
				}
			: null,
	}));

	return <WishlistPage initialItems={initialItems} />;
}
