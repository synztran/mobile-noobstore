import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface OrderItemComponentDetail {
	variant_id: string;
	variant_name: string;
	component_group: string;
	price_adjustment: number;
	thumbnail: string | null;
}

export interface OrderItemDetail {
	id: string;
	product_id: string | null;
	product_name: string;
	unit_price: number;
	quantity: number;
	thumbnail: string | null;
	components: OrderItemComponentDetail[];
}

export interface OrderDetail {
	id: string;
	order_number: string;
	status: "pending" | "confirmed" | "delivering" | "delivered" | "cancelled";
	total_price: number;
	shipping_fee: number;
	voucher_code: string | null;
	voucher_discount_amount: number;
	shipping_discount_amount: number;
	voucher_snapshot: unknown | null;
	cancelled_at: string | null;
	cancelled_note: string | null;
	created_at: string | null;
	updated_at: string | null;
	items: OrderItemDetail[];
}

interface RawOrderRow {
	id: string;
	order_number: string;
	status: "pending" | "confirmed" | "delivering" | "delivered" | "cancelled";
	total_price: number;
	shipping_fee: number | null;
	voucher_code: string | null;
	voucher_discount_amount: number | string | null;
	shipping_discount_amount: number | string | null;
	voucher_snapshot: unknown | null;
	cancelled_at: string | null;
	cancelled_note: string | null;
	created_at: string | null;
	updated_at: string | null;
}

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const { id } = await params;
		if (!id) {
			return NextResponse.json(
				{ error: "Order ID is required" },
				{ status: 400 },
			);
		}

		const { data: order, error: orderError } = (await supabase
			.from("orders")
			.select(
				"id, order_number, status, total_price, shipping_fee, voucher_code, voucher_discount_amount, shipping_discount_amount, voucher_snapshot, cancelled_at, cancelled_note, created_at, updated_at",
			)
			.eq("id", id)
			.eq("user_id", user.id)
			.single()) as unknown as {
			data: RawOrderRow | null;
			error: { message: string } | null;
		};

		if (orderError || !order) {
			return NextResponse.json(
				{ error: "Order not found" },
				{ status: 404 },
			);
		}

		const { data: rawItems } = await supabase
			.from("order_items")
			.select(
				"id, product_id, product_name, unit_price, quantity, thumbnail",
			)
			.eq("order_id", id);

		const orderItems = rawItems ?? [];
		const orderItemIds = orderItems.map((row) => row.id);

		let rawComponents: Array<{
			order_item_id: string;
			variant_id: string;
			variant_name: string;
			component_group: string;
			price_adjustment: number | null;
			thumbnail: string | null;
		}> = [];

		if (orderItemIds.length > 0) {
			const { data } = await supabase
				.from("order_item_components")
				.select(
					"order_item_id, variant_id, variant_name, component_group, price_adjustment, thumbnail",
				)
				.in("order_item_id", orderItemIds);
			rawComponents = data ?? [];
		}

		const productIds = Array.from(
			new Set(
				orderItems
					.map((row) => row.product_id)
					.filter((value): value is string => Boolean(value)),
			),
		);

		let productRows: Array<{ id: string; thumbnail: string | null }> = [];
		if (productIds.length > 0) {
			const { data } = await supabase
				.from("products")
				.select("id, thumbnail")
				.in("id", productIds);
			productRows = data ?? [];
		}

		const productThumbnailById = new Map(
			productRows.map((row) => [row.id, row.thumbnail]),
		);

		const componentsByOrderItemId = rawComponents.reduce<
			Record<string, OrderItemComponentDetail[]>
		>((acc, comp) => {
			const bucket = acc[comp.order_item_id] ?? [];
			bucket.push({
				variant_id: comp.variant_id,
				variant_name: comp.variant_name,
				component_group: comp.component_group,
				price_adjustment: Number(comp.price_adjustment ?? 0),
				thumbnail: comp.thumbnail,
			});
			acc[comp.order_item_id] = bucket;
			return acc;
		}, {});

		const items: OrderItemDetail[] = orderItems.map((row) => {
			const components = componentsByOrderItemId[row.id] ?? [];
			const componentsTotal = components.reduce(
				(sum, comp) => sum + comp.price_adjustment,
				0,
			);

			const componentThumbnail = components.find(
				(comp) => comp.thumbnail,
			)?.thumbnail;

			return {
				id: row.id,
				product_id: row.product_id,
				product_name: row.product_name,
				unit_price: Number(row.unit_price),
				quantity: row.quantity,
				thumbnail:
					row.thumbnail ??
					componentThumbnail ??
					(row.product_id
						? (productThumbnailById.get(row.product_id) ?? null)
						: null),
				components,
			};
		});

		return NextResponse.json({
			id: order.id,
			order_number: order.order_number,
			status: order.status,
			total_price: Number(order.total_price),
			shipping_fee: Number(order.shipping_fee ?? 0),
			voucher_code: order.voucher_code ?? null,
			voucher_discount_amount: Number(order.voucher_discount_amount ?? 0),
			shipping_discount_amount: Number(
				order.shipping_discount_amount ?? 0,
			),
			voucher_snapshot: order.voucher_snapshot ?? null,
			cancelled_at: order.cancelled_at ?? null,
			cancelled_note: order.cancelled_note ?? null,
			created_at: order.created_at ?? null,
			updated_at: order.updated_at ?? null,
			items,
		} satisfies OrderDetail);
	} catch (err) {
		console.error("[order detail] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
