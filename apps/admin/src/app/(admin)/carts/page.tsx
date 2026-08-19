import { getAdminClient } from "@/lib/supabase/admin";
import CartsClient from "@/components/carts/CartsClient";

export const metadata = { title: "Cart Monitoring - NoobStore Admin" };

const PAGE_SIZE = 20;

interface RawCartItem {
	id: string;
	quantity: number;
	product_id: string | null;
	variant_id: string | null;
	parent_cart_item_id: string | null;
	products: {
		id: string;
		name: string;
		base_price: number;
		thumbnail: string | null;
	} | null;
}

interface RawCart {
	id: string;
	user_id: string | null;
	created_at: string | null;
	updated_at: string | null;
	users: {
		id: string;
		email: string;
		first_name: string | null;
		last_name: string | null;
	} | null;
	cart_items: RawCartItem[];
}

interface RawVariant {
	id: string;
	variant_name: string;
	price_adjustment: number | null;
	thumbnail: string | null;
}

interface RawComponentVariant {
	product_variant_id: string | null;
	kit_product_id: string | null;
	component_product_id: string | null;
	component_product_name: string | null;
	price_adjustment: number | null;
}

interface EnrichedCartItem {
	id: string;
	quantity: number;
	product_id: string | null;
	product_name: string | null;
	product_thumbnail: string | null;
	base_price: number;
	variant_id: string | null;
	parent_cart_item_id: string | null;
	variant_name: string | null;
	unit_price: number;
	children: EnrichedCartItem[];
}

interface EnrichedCart {
	id: string;
	user_id: string | null;
	created_at: string | null;
	updated_at: string | null;
	users: {
		id: string;
		email: string;
		first_name: string | null;
		last_name: string | null;
	} | null;
	cart_items: EnrichedCartItem[];
	itemCount: number;
	cartTotal: number;
	cartStatus: string;
}

interface Props {
	searchParams: Promise<{ q?: string; by?: string; status?: string; page?: string; sort?: string; dir?: string }>;
}

export default async function CartsPage({ searchParams }: Props) {
	const { q = "", by = "user", status = "", page, sort: sortBy = "", dir = "asc" } = await searchParams;
	const currentPage = Math.max(1, parseInt(page ?? "1", 10));
	const supabase = getAdminClient();

	const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

	// Pre-compute all users who have placed an order (used by multiple status filters)
	const { data: orderUsers } = await supabase
		.from("orders")
		.select("user_id")
		.not("user_id", "is", null);
	const usersWithOrders = new Set(
		(orderUsers ?? [])
			.map((o: { user_id: string | null }) => o.user_id)
			.filter((id): id is string => id !== null),
	);
	const usersWithOrdersArray = [...usersWithOrders];

	let query = supabase
		.from("carts")
		.select(
			`
				id,
				user_id,
				created_at,
				updated_at,
				users!carts_user_id_fkey (id, email, first_name, last_name),
				cart_items (
					id,
					quantity,
					product_id,
					variant_id,
					parent_cart_item_id,
					products (id, name, base_price, thumbnail)
				)
			`,
			{ count: "exact" },
		);

	if (q) {
		if (by === "cart") {
			query = query.ilike("id", `%${q}%`);
		} else {
			const { data: users } = await supabase
				.from("users")
				.select("id")
				.or(
					`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`,
				);
			const userIds = (users ?? []).map((u) => u.id);
			if (userIds.length === 0) {
				return (
					<CartsClient
						carts={[]}
						count={0}
						currentPage={1}
						totalPages={1}
						q={q}
						searchBy={by}
						status={status}
						sortBy={sortBy}
						sortDir={dir}
					/>
				);
			}
			query = query.in("user_id", userIds);
		}
	}

	if (status === "guest") {
		query = query.is("user_id", null);
	} else if (status === "registered") {
		query = query.not("user_id", "is", null);
	} else if (status === "abandoned") {
		query = query.not("user_id", "is", null).lt("updated_at", cutoffDate);
	} else if (status === "converted") {
		query = query.in("user_id", usersWithOrdersArray);
	} else if (status === "active") {
		query = query
			.not("user_id", "is", null)
			.gte("updated_at", cutoffDate);
		if (usersWithOrdersArray.length > 0) {
			query = query.not("user_id", "in", usersWithOrdersArray);
		}
	}

	if (sortBy === "updated_at" || sortBy === "created_at") {
		query = query.order(sortBy, { ascending: dir !== "desc" });
	} else {
		query = query.order("user_id", { ascending: dir !== "desc" });
	}

	query = query.range(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE - 1,
	);

	const { data: carts, count, error } = await query;

	if (error) {
		console.error("Error fetching carts:", error);
	}

	const cartList = carts ?? [];

	const allVariantIds = [
		...new Set(
			cartList.flatMap((c: RawCart) =>
				(c.cart_items ?? []).map((i: RawCartItem) => i.variant_id).filter(Boolean),
			),
		),
	] as string[];

	const { data: variants } =
		allVariantIds.length > 0
			? await supabase
					.from("product_variants")
					.select("id, variant_name, price_adjustment, thumbnail")
					.in("id", allVariantIds)
			: { data: [] };

	const variantMap = new Map<string, RawVariant>(
		(variants ?? []).map((v: RawVariant) => [v.id, v]),
	);

	// Child (component) cart_items store the kit's product_id, so the embedded
	// `products` join resolves to the kit name. Resolve the real component
	// identity via the kit_component_variants view (same keying as the web cart).
	const childVariantIds = [
		...new Set(
			cartList.flatMap((c: RawCart) =>
				(c.cart_items ?? [])
					.filter((i: RawCartItem) => i.parent_cart_item_id)
					.map((i: RawCartItem) => i.variant_id)
					.filter(Boolean),
			),
		),
	] as string[];

	const { data: componentVariants } =
		childVariantIds.length > 0
			? await supabase
					.from("kit_component_variants")
					.select(
						"product_variant_id, kit_product_id, component_product_id, component_product_name, price_adjustment",
					)
					.in("product_variant_id", childVariantIds)
			: { data: [] };

	const componentVariantMap = new Map<string, RawComponentVariant>(
		(componentVariants ?? []).map(
			(v: RawComponentVariant) =>
				[`${v.product_variant_id}::${v.kit_product_id}`, v] as const,
		),
	);

	const enriched: EnrichedCart[] = cartList.map((cart: RawCart) => {
		const allItems = cart.cart_items ?? [];
		const parentItems = allItems.filter((i: RawCartItem) => !i.parent_cart_item_id);
		const childrenByParent = new Map<string, RawCartItem[]>();
		for (const child of allItems) {
			if (!child.parent_cart_item_id) continue;
			const pid = child.parent_cart_item_id;
			if (!childrenByParent.has(pid)) childrenByParent.set(pid, []);
			childrenByParent.get(pid)!.push(child);
		}

		const itemCount = parentItems.length;

		const cartTotal = parentItems.reduce((sum: number, item: RawCartItem) => {
			const basePrice = item.products?.base_price ?? 0;
			const variantAdj =
				item.variant_id && variantMap.has(item.variant_id)
					? Number(variantMap.get(item.variant_id)!.price_adjustment ?? 0)
					: 0;

			const children = childrenByParent.get(item.id) ?? [];
			const childrenAdj = children.reduce(
				(s: number, child: RawCartItem) => {
					const adj =
						child.variant_id && variantMap.has(child.variant_id)
							? Number(variantMap.get(child.variant_id)!.price_adjustment ?? 0)
							: 0;
					return s + adj;
				},
				0,
			);

			return sum + (basePrice + variantAdj + childrenAdj) * item.quantity;
		}, 0);

		let cartStatus = "active";
		if (!cart.user_id) {
			cartStatus = "guest";
		} else if (usersWithOrders.has(cart.user_id)) {
			cartStatus = "converted";
		} else if (cart.updated_at) {
			const hoursAgo =
				(Date.now() - new Date(cart.updated_at).getTime()) /
				(1000 * 60 * 60);
			if (hoursAgo > 24) {
				cartStatus = "abandoned";
			}
		}

		function enrichItem(item: RawCartItem) {
			const variant =
				item.variant_id && variantMap.has(item.variant_id)
					? variantMap.get(item.variant_id)!
					: null;
			const isChild = Boolean(item.parent_cart_item_id);
			const component =
				isChild && item.variant_id && item.product_id
					? (componentVariantMap.get(
							`${item.variant_id}::${item.product_id}`,
						) ?? null)
					: null;
			return {
				id: item.id,
				quantity: item.quantity,
				product_id: component?.component_product_id ?? item.product_id,
				product_name:
					component?.component_product_name ??
					item.products?.name ??
					null,
				product_thumbnail: item.products?.thumbnail ?? null,
				base_price: item.products?.base_price ?? 0,
				variant_id: item.variant_id,
				parent_cart_item_id: item.parent_cart_item_id,
				variant_name: variant?.variant_name ?? null,
				unit_price: isChild
					? Number(component?.price_adjustment ?? 0) ||
						(item.products?.base_price ?? 0) +
							Number(variant?.price_adjustment ?? 0)
					: (item.products?.base_price ?? 0) +
						Number(variant?.price_adjustment ?? 0),
				children: [] as EnrichedCartItem[],
			};
		}

		const enrichedItems = allItems.map(enrichItem);
		const enrichedChildrenByParent = new Map<string, EnrichedCartItem[]>();
		for (const enrichedItem of enrichedItems) {
			if (!enrichedItem.parent_cart_item_id) continue;
			const pid = enrichedItem.parent_cart_item_id;
			if (!enrichedChildrenByParent.has(pid)) enrichedChildrenByParent.set(pid, []);
			enrichedChildrenByParent.get(pid)!.push(enrichedItem);
		}
		for (const enrichedItem of enrichedItems) {
			if (enrichedItem.parent_cart_item_id) continue;
			enrichedItem.children = enrichedChildrenByParent.get(enrichedItem.id) ?? [];
		}

		return {
			id: cart.id,
			user_id: cart.user_id,
			created_at: cart.created_at,
			updated_at: cart.updated_at,
			users: cart.users,
			cart_items: enrichedItems.filter((i) => !i.parent_cart_item_id),
			itemCount,
			cartTotal,
			cartStatus,
		};
	});

	const totalPages = Math.max(
		1,
		Math.ceil((count ?? 0) / PAGE_SIZE),
	);

	return (
		<CartsClient
			carts={enriched}
			count={count ?? 0}
			currentPage={currentPage}
			totalPages={totalPages}
			q={q}
			searchBy={by}
			status={status}
			sortBy={sortBy}
			sortDir={dir}
		/>
	);
}
