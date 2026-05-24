import CopyToClipboardButton from "@/components/products/CopyToClipboardButton";
import EditProductModal from "@/components/products/EditProductModal";
import Tag from "@/components/ui/Tag";

type VariantRow = {
	id: string;
	variant_name: string;
	price_adjustment: number | null;
	stock_quantity: number | null;
	is_pre_order: boolean | null;
	attributes: unknown;
};

type ComponentRow = {
	id: string;
	component_group: string;
	is_required: boolean | null;
	max_quantity: number | null;
	component_product: {
		id: string;
		name: string;
		thumbnail: string | null;
		product_variants?: VariantRow[] | null;
	} | null;
};

type CategoryRelation = { name: string } | { name: string }[] | null;

type ProductCardProps = {
	product: {
		id: string;
		name: string;
		slug: string;
		base_price: number;
		stock_quantity: number | null;
		product_type: string;
		brand: string | null;
		description?: string | null;
		is_used: boolean | null;
		thumbnail: string | null;
		categories?: CategoryRelation;
		product_variants?: VariantRow[] | null;
		product_components?: ComponentRow[] | null;
	};
};

type DisplayVariant = VariantRow & {
	display_name: string;
};

export default function ProductCard({ product }: ProductCardProps) {
	const directVariants = product.product_variants ?? [];
	const components = product.product_components ?? [];

	const componentVariants: DisplayVariant[] = components.flatMap(
		(component) => {
			const componentName =
				component.component_product?.name ?? "Component";
			const variants =
				component.component_product?.product_variants ?? [];
			return variants.map((variant) => ({
				...variant,
				display_name: `${componentName}: ${variant.variant_name}`,
			}));
		},
	);

	const effectiveVariants: DisplayVariant[] =
		product.product_type === "kit"
			? componentVariants
			: directVariants.map((variant) => ({
					...variant,
					display_name: variant.variant_name,
				}));

	const hasPreOrderVariant = effectiveVariants.some(
		(variant) => variant.is_pre_order,
	);

	const componentGroups = components.reduce<Record<string, ComponentRow[]>>(
		(acc, component) => {
			const group = component.component_group;
			if (!acc[group]) acc[group] = [];
			acc[group].push(component);
			return acc;
		},
		{},
	);

	const categoryName = Array.isArray(product.categories)
		? product.categories[0]?.name
		: product.categories?.name;

	return (
		<div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
			<div className="flex flex-col items-start gap-4 p-4 bg-slate-50 border-b border-slate-200">
				<div className="flex items-start gap-4">
					{product.thumbnail && (
						<img
							src={product.thumbnail}
							alt={product.name}
							className="w-12 h-12 rounded object-cover shrink-0 mt-0.5"
						/>
					)}
					<div className="flex-1 min-w-0 space-y-1.5">
						<div className="clear-both">
							<p className="font-semibold text-slate-900">
								{product.name}
							</p>
							<div className="flex items-center gap-2 mt-1">
								<Tag tone="blue">{product.product_type}</Tag>
								<Tag
									tone={product.is_used ? "yellow" : "green"}>
									{product.is_used ? "Used" : "New"}
								</Tag>
								{hasPreOrderVariant && (
									<Tag tone="purple">Pre-order</Tag>
								)}
							</div>
						</div>
					</div>
					<div className="shrink-0">
						<EditProductModal product={product} />
					</div>
				</div>
				<div>
					<dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs">
						<div className="flex items-baseline gap-1">
							<dt className="text-slate-400 shrink-0">ID</dt>
							<dd className="flex items-center gap-1 font-mono text-slate-400 truncate select-all">
								<span className="truncate">{product.id}</span>
								<CopyToClipboardButton
									value={product.id}
									label={`Copy product ID ${product.id}`}
								/>
							</dd>
						</div>
						<div className="flex items-baseline gap-1">
							<dt className="text-slate-400 shrink-0">Slug</dt>
							<dd className="font-mono text-slate-500 truncate">
								/{product.slug}
							</dd>
						</div>
						<div className="flex items-baseline gap-1">
							<dt className="text-slate-400 shrink-0">Price</dt>
							<dd className="font-semibold text-slate-800">
								{product.base_price.toLocaleString("vi-VN")}₫
							</dd>
						</div>
						<div className="flex items-baseline gap-1">
							<dt className="text-slate-400 shrink-0">Stock</dt>
							<dd className="text-slate-600">
								{product.stock_quantity ?? "—"}
							</dd>
						</div>
						{product.brand && (
							<div className="flex items-baseline gap-1">
								<dt className="text-slate-400 shrink-0">
									Brand
								</dt>
								<dd className="text-slate-600 truncate">
									{product.brand}
								</dd>
							</div>
						)}
						{categoryName && (
							<div className="flex items-baseline gap-1">
								<dt className="text-slate-400 shrink-0">
									Category
								</dt>
								<dd className="text-slate-600 truncate">
									{categoryName}
								</dd>
							</div>
						)}
					</dl>
				</div>
			</div>

			{effectiveVariants.length > 0 && (
				<div className="p-4 border-b border-slate-100">
					<div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
						Variants ({effectiveVariants.length})
					</div>
					<div className="flex flex-wrap gap-2">
						{effectiveVariants.map((variant) => (
							<div
								key={`${variant.id}-${variant.display_name}`}
								className="flex flex-col text-xs bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-lg">
								<span className="font-medium">
									{variant.display_name}
								</span>
								{variant.price_adjustment !== null &&
									variant.price_adjustment !== 0 && (
										<span
											className={
												variant.price_adjustment > 0
													? "text-green-600"
													: "text-red-600"
											}>
											{variant.price_adjustment > 0
												? "+"
												: ""}
											{variant.price_adjustment.toLocaleString(
												"vi-VN",
											)}
											₫
										</span>
									)}
								<span className="text-slate-400">
									{variant.stock_quantity ?? 0} in stock
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{Object.keys(componentGroups).length > 0 && (
				<div className="p-4">
					<div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
						Components
					</div>
					<div className="grid grid-cols-2 gap-2">
						{Object.entries(componentGroups).map(
							([group, items]) => (
								<div key={group}>
									<div className="flex items-center gap-2 mb-1">
										<span className="w-3 h-px bg-slate-300 inline-block" />
										<span className="text-xs font-medium text-slate-600">
											{group}
										</span>
									</div>
									<div className="ml-5 flex flex-wrap gap-2">
										{items.map((component) => (
											<div
												key={component.id}
												className="flex flex-col gap-1 text-xs bg-indigo-50 text-indigo-700 p-2 rounded-md">
												{component.component_product
													?.name ?? "Unknown"}
												<div className="flex flex-wrap items-center gap-1">
													<Tag
														tone={
															component.is_required
																? "red"
																: "blue"
														}>
														{component.is_required
															? "Required"
															: "Optional"}
													</Tag>
												</div>
											</div>
										))}
									</div>
								</div>
							),
						)}
					</div>
				</div>
			)}
		</div>
	);
}
