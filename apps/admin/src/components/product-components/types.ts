export type ProductOption = {
	id: string;
	name: string;
	product_type: string;
	thumbnail: string | null;
	base_price?: number | null;
	stock_quantity?: number | null;
	brand?: string | null;
};

export type ProductComponentRow = {
	id: string;
	parent_product_id: string | null;
	component_product_id: string | null;
	component_group: string;
	is_required: boolean | null;
	max_quantity: number | null;
	parent_product: ProductOption | null;
	component_product: ProductOption | null;
};

export type ProductComponentGroup = {
	parent_product_id: string;
	parent_product: ProductOption | null;
	components: ProductComponentRow[];
};
