"use client";

import type { AddToCartRequest } from "@/app/api/cart/add/route";
import type { ConfiguratorGroup } from "@/app/api/products/[id]/configurator/route";
import type { ProductsResponse, ShopProduct } from "@/app/api/products/route";
import Icon from "@/components/ui/Icon";
import { formatVND } from "@/lib/currency";
import type { SelectedComponent } from "@/lib/data";
import type { CategoryItem } from "@/lib/products-server";
import { toast } from "@/lib/toast";
import { useCartStore } from "@/store";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useReducer, useRef } from "react";

// ─── State ────────────────────────────────────────────────────────────────────

type DrawerView = "product-list" | "configurator";

interface DrawerState {
	view: DrawerView;
	/** Products in category (category mode only) */
	products: ShopProduct[];
	/** Which product the configurator is open for */
	activeProduct: ShopProduct | null;
	groups: ConfiguratorGroup[];
	/** group label → selected variant id */
	selections: Record<string, string>;
	loadingProducts: boolean;
	loadingConfigurator: boolean;
	submitting: boolean;
}

type DrawerAction =
	| { type: "RESET" }
	| { type: "LOAD_PRODUCTS_START" }
	| { type: "LOAD_PRODUCTS_DONE"; products: ShopProduct[] }
	| { type: "SELECT_PRODUCT"; product: ShopProduct }
	| { type: "LOAD_CONFIGURATOR_START" }
	| { type: "LOAD_CONFIGURATOR_DONE"; groups: ConfiguratorGroup[] }
	| { type: "BACK_TO_LIST" }
	| { type: "SELECT"; group: string; variantId: string }
	| { type: "SUBMIT_START" }
	| { type: "SUBMIT_DONE" };

const INITIAL_STATE: DrawerState = {
	view: "product-list",
	products: [],
	activeProduct: null,
	groups: [],
	selections: {},
	loadingProducts: false,
	loadingConfigurator: false,
	submitting: false,
};

function reduce(state: DrawerState, action: DrawerAction): DrawerState {
	switch (action.type) {
		case "RESET":
			return { ...INITIAL_STATE };
		case "LOAD_PRODUCTS_START":
			return { ...state, products: [], loadingProducts: true };
		case "LOAD_PRODUCTS_DONE":
			return {
				...state,
				products: action.products,
				loadingProducts: false,
			};
		case "SELECT_PRODUCT":
			return {
				...state,
				activeProduct: action.product,
				groups: [],
				selections: {},
				loadingConfigurator: true,
				view: "configurator",
			};
		case "LOAD_CONFIGURATOR_START":
			return { ...state, groups: [], loadingConfigurator: true };
		case "LOAD_CONFIGURATOR_DONE":
			return {
				...state,
				groups: action.groups,
				loadingConfigurator: false,
			};
		case "BACK_TO_LIST":
			return {
				...state,
				view: "product-list",
				activeProduct: null,
				groups: [],
				selections: {},
			};
		case "SELECT":
			return {
				...state,
				selections: {
					...state.selections,
					[action.group]: action.variantId,
				},
			};
		case "SUBMIT_START":
			return { ...state, submitting: true };
		case "SUBMIT_DONE":
			return { ...state, submitting: false };
		default:
			return state;
	}
}

// ─── Props ────────────────────────────────────────────────────────────────────

type QuickPickDrawerProps = {
	isOpen: boolean;
	onClose: () => void;
} & (
	| { mode?: "product"; product: ShopProduct | null; category?: never }
	| { mode: "category"; category: CategoryItem | null; product?: never }
);

// ─── Component ────────────────────────────────────────────────────────────────

export function QuickPickDrawer(props: QuickPickDrawerProps) {
	const { isOpen, onClose } = props;
	const isCategoryMode = props.mode === "category";

	// Extract props safely upfront to avoid repeated discriminant checks
	const propCategory: CategoryItem | null = isCategoryMode
		? (props.category ?? null)
		: null;
	const propProduct: ShopProduct | null = isCategoryMode
		? null
		: (props.product ?? null);

	const [state, dispatch] = useReducer(reduce, INITIAL_STATE);
	const { addItem, openCart } = useCartStore();

	// refs to avoid duplicate fetches
	const fetchedCategorySlug = useRef<string | null>(null);
	const fetchedProductId = useRef<string | null>(null);

	// ── Category mode: fetch product list ────────────────────────────────
	useEffect(() => {
		if (!isCategoryMode || !isOpen || !propCategory) return;
		if (fetchedCategorySlug.current === propCategory.slug) return;

		fetchedCategorySlug.current = propCategory.slug;
		dispatch({ type: "LOAD_PRODUCTS_START" });

		fetch(
			`/api/products?categorySlug=${encodeURIComponent(propCategory.slug)}`,
		)
			.then((r) => r.json())
			.then((res: ProductsResponse) => {
				dispatch({
					type: "LOAD_PRODUCTS_DONE",
					products: res.products,
				});
			})
			.catch(() => {
				dispatch({ type: "LOAD_PRODUCTS_DONE", products: [] });
				toast.error("Không thể tải sản phẩm");
			});
	}, [isOpen, isCategoryMode, propCategory?.slug]);

	// ── Fetch configurator when a product becomes active ─────────────────
	useEffect(() => {
		const productId =
			state.activeProduct?.id ??
			(isCategoryMode ? null : propProduct?.id);
		if (!productId) return;
		if (state.view !== "configurator") return;
		if (fetchedProductId.current === productId) return;

		fetchedProductId.current = productId;
		dispatch({ type: "LOAD_CONFIGURATOR_START" });

		fetch(`/api/products/${productId}/configurator`)
			.then((r) => r.json())
			.then((groups: ConfiguratorGroup[]) => {
				dispatch({ type: "LOAD_CONFIGURATOR_DONE", groups });
			})
			.catch(() => {
				dispatch({ type: "LOAD_CONFIGURATOR_DONE", groups: [] });
				toast.error("Không thể tải cấu hình sản phẩm");
			});
	}, [state.activeProduct?.id, state.view, isCategoryMode]);

	// ── Product mode: open directly in configurator view on mount ────────
	useEffect(() => {
		if (isCategoryMode || !isOpen || !propProduct) return;
		if (fetchedProductId.current === propProduct.id) return;
		if (state.view === "configurator") return;

		fetchedProductId.current = propProduct.id;
		dispatch({ type: "SELECT_PRODUCT", product: propProduct });

		fetch(`/api/products/${propProduct.id}/configurator`)
			.then((r) => r.json())
			.then((groups: ConfiguratorGroup[]) => {
				dispatch({ type: "LOAD_CONFIGURATOR_DONE", groups });
			})
			.catch(() => {
				dispatch({ type: "LOAD_CONFIGURATOR_DONE", groups: [] });
			});
	}, [isOpen, isCategoryMode, propProduct?.id]);

	// ── Reset when closed ────────────────────────────────────────────────
	useEffect(() => {
		if (!isOpen) {
			fetchedCategorySlug.current = null;
			fetchedProductId.current = null;
			dispatch({ type: "RESET" });
		}
	}, [isOpen]);

	// ── Escape key ───────────────────────────────────────────────────────
	useEffect(() => {
		if (!isOpen) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isOpen, onClose]);

	// ── Active product (product mode uses prop, category mode uses state) ─
	const activeProduct =
		state.activeProduct ?? (isCategoryMode ? null : propProduct);

	// ── Derived price ─────────────────────────────────────────────────────
	const componentAdjustment = state.groups.reduce((sum, group) => {
		const selectedId = state.selections[group.component_group];
		if (!selectedId) return sum;
		const v = group.variants.find((v) => v.id === selectedId);
		return sum + (v?.price_adjustment ?? 0);
	}, 0);

	const hasComponents = state.groups.length > 0;
	const totalPrice = (activeProduct?.base_price ?? 0) + componentAdjustment;

	const missingRequired = state.groups
		.filter((g) => g.is_required && !state.selections[g.component_group])
		.map((g) => g.component_group);
	const canAdd = missingRequired.length === 0;

	// ── Add to cart ───────────────────────────────────────────────────────
	const handleAdd = async () => {
		if (!activeProduct || !canAdd) {
			if (!canAdd)
				toast.error(`Vui lòng chọn: ${missingRequired.join(", ")}`);
			return;
		}

		dispatch({ type: "SUBMIT_START" });

		const components: SelectedComponent[] = state.groups.flatMap(
			(group) => {
				const selectedId = state.selections[group.component_group];
				if (!selectedId) return [];
				const v = group.variants.find((v) => v.id === selectedId);
				if (!v) return [];
				return [
					{
						variant_id: v.id,
						variant_name: v.variant_name,
						component_group: group.component_group,
						price_adjustment: v.price_adjustment,
						thumbnail: v.thumbnail,
					},
				];
			},
		);

		try {
			const body: AddToCartRequest = {
				parent_product_id: activeProduct.id,
				selected_variant_ids: components.map((c) => c.variant_id),
			};
			await fetch("/api/cart/add", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
		} catch {
			console.warn("[QuickPickDrawer] cart/add API failed");
		}

		addItem(
			{
				id: activeProduct.id,
				name: activeProduct.name,
				category: activeProduct.category,
				base_price: activeProduct.base_price,
				stock_quantity: activeProduct.stock_quantity,
				thumbnail: activeProduct.thumbnail,
			},
			null,
			hasComponents ? components : undefined,
		);

		dispatch({ type: "SUBMIT_DONE" });
		toast.success("Đã thêm vào giỏ hàng!");
		onClose();
		openCart();
	};

	// ── Header label ──────────────────────────────────────────────────────
	const headerCategory = isCategoryMode
		? (propCategory?.name ?? "")
		: (activeProduct?.category ?? "");

	const headerTitle =
		state.view === "configurator" && activeProduct
			? activeProduct.name
			: headerCategory;

	// ── Render helpers ────────────────────────────────────────────────────
	const renderProductList = () => (
		<div className="space-y-3">
			{state.loadingProducts &&
				Array.from({ length: 4 }).map((_, i) => (
					<div
						key={i}
						className="flex gap-3 animate-pulse items-center">
						<div className="w-16 h-16 rounded-xl bg-surface-container flex-shrink-0" />
						<div className="flex-1 space-y-2">
							<div className="h-2.5 w-20 bg-surface-container rounded-full" />
							<div className="h-3 w-4/5 bg-surface-container rounded-full" />
							<div className="h-2.5 w-1/3 bg-surface-container rounded-full" />
						</div>
					</div>
				))}

			{!state.loadingProducts && state.products.length === 0 && (
				<p className="text-on-surface-variant text-sm text-center py-8">
					Không có sản phẩm nào
				</p>
			)}

			{!state.loadingProducts &&
				state.products.map((p) => (
					<button
						key={p.id}
						type="button"
						onClick={() =>
							dispatch({ type: "SELECT_PRODUCT", product: p })
						}
						className="w-full flex gap-3 items-center bg-surface-container rounded-2xl p-3 active:scale-[0.98] transition-transform text-left">
						{/* Thumbnail */}
						<div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container-high">
							{p.thumbnail ? (
								<Image
									src={p.thumbnail}
									alt={p.name}
									fill
									className="object-cover"
									unoptimized
								/>
							) : (
								<div className="absolute inset-0 flex items-center justify-center">
									<Icon
										name="inventory_2"
										className="text-2xl text-outline-variant"
									/>
								</div>
							)}
						</div>
						{/* Info */}
						<div className="flex-1 min-w-0">
							<p className="text-[10px] font-black uppercase tracking-wider text-primary leading-none mb-0.5">
								{p.category}
							</p>
							<p className="text-sm font-black text-on-surface uppercase leading-tight line-clamp-2">
								{p.name}
							</p>
							<p className="text-xs font-bold text-primary mt-1">
								{formatVND(p.min_price)}
							</p>
						</div>
						{/* Arrow */}
						<Icon
							name="chevron_right"
							className="text-outline-variant text-xl flex-shrink-0"
						/>
					</button>
				))}
		</div>
	);

	const renderConfigurator = () => (
		<div className="space-y-5">
			{/* Selected product header */}
			{activeProduct && (
				<div className="flex gap-3 items-center bg-surface-container rounded-2xl p-3">
					<div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container-high">
						{activeProduct.thumbnail ? (
							<Image
								src={activeProduct.thumbnail}
								alt={activeProduct.name}
								fill
								className="object-cover"
								unoptimized
							/>
						) : (
							<div className="absolute inset-0 flex items-center justify-center">
								<Icon
									name="inventory_2"
									className="text-xl text-outline-variant"
								/>
							</div>
						)}
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-[10px] font-black uppercase tracking-wider text-primary leading-none mb-0.5">
							{activeProduct.category}
						</p>
						<p className="text-sm font-black text-on-surface uppercase leading-tight line-clamp-1">
							{activeProduct.name}
						</p>
						<p className="text-xs font-bold text-primary mt-0.5">
							{formatVND(activeProduct.base_price)}
						</p>
					</div>
				</div>
			)}

			{/* Loading component groups */}
			{state.loadingConfigurator && (
				<div className="space-y-4">
					{[1, 2].map((i) => (
						<div key={i} className="space-y-2 animate-pulse">
							<div className="h-3 w-32 bg-surface-container rounded-full" />
							<div className="flex gap-2">
								{[1, 2, 3].map((j) => (
									<div
										key={j}
										className="h-14 w-24 bg-surface-container rounded-xl"
									/>
								))}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Component group selectors */}
			{!state.loadingConfigurator &&
				state.groups.map((group) => (
					<div key={group.component_group} className="space-y-2">
						<div className="flex items-center gap-2">
							<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
								{group.component_group}
							</p>
							{group.is_required && (
								<span className="text-[8px] font-black text-error bg-error/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
									Bắt buộc
								</span>
							)}
						</div>
						<div className="flex flex-wrap gap-2">
							{group.variants.map((v) => {
								const selected =
									state.selections[group.component_group] ===
									v.id;
								return (
									<button
										key={v.id}
										type="button"
										onClick={() =>
											dispatch({
												type: "SELECT",
												group: group.component_group,
												variantId: v.id,
											})
										}
										className={clsx(
											"flex items-center gap-2 py-2 px-3 rounded-xl text-sm font-bold transition-all border",
											selected
												? "bg-primary text-white border-primary shadow-lg"
												: "bg-surface-container text-on-surface border-transparent hover:border-outline-variant",
										)}>
										{v.thumbnail && (
											<div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 relative">
												<Image
													src={v.thumbnail}
													alt={v.variant_name}
													fill
													className="object-cover"
													unoptimized
												/>
											</div>
										)}
										<div className="text-left">
											<p className="font-black text-xs leading-none">
												{v.variant_name}
											</p>
											{v.price_adjustment !== 0 && (
												<p
													className={clsx(
														"text-[10px] mt-0.5",
														selected
															? "opacity-80"
															: "opacity-60",
													)}>
													+
													{formatVND(
														v.price_adjustment,
													)}
												</p>
											)}
										</div>
									</button>
								);
							})}
						</div>
					</div>
				))}

			{/* Simple variant selector (non-composite products) */}
			{!state.loadingConfigurator &&
				!hasComponents &&
				activeProduct &&
				activeProduct.variants.length > 0 && (
					<div className="space-y-2">
						<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
							Chọn tùy chọn
						</p>
						<div className="grid grid-cols-2 gap-2">
							{activeProduct.variants.map((v) => (
								<button
									key={v.id}
									type="button"
									onClick={() =>
										dispatch({
											type: "SELECT",
											group: "__variant__",
											variantId: v.id,
										})
									}
									className={clsx(
										"py-3 px-4 rounded-xl text-sm font-bold transition-all text-left",
										state.selections["__variant__"] === v.id
											? "bg-primary text-white shadow-lg"
											: "bg-surface-container text-on-surface hover:bg-surface-container-high",
									)}>
									<p className="font-black truncate">
										{v.variant_name}
									</p>
									<p className="text-xs opacity-70 mt-0.5">
										{formatVND(v.effective_price)}
									</p>
								</button>
							))}
						</div>
					</div>
				)}
		</div>
	);

	// ── Don't render if no valid subject ─────────────────────────────────
	const hasSubject = isCategoryMode ? !!propCategory : !!propProduct;

	if (!hasSubject) return null;

	return (
		<>
			{/* Backdrop */}
			<div
				className={clsx(
					"fixed inset-0 bg-on-surface/30 backdrop-blur-sm z-[60] transition-opacity duration-300 !mt-0",
					isOpen
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none",
				)}
				onClick={onClose}
			/>

			{/* Drawer */}
			<div
				className={clsx(
					"fixed left-0 right-0 z-[999] bg-surface rounded-t-3xl transition-all duration-300 ease-out max-h-[90dvh] flex flex-col",
					isOpen ? "bottom-0" : "-bottom-full",
				)}>
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-1 flex-shrink-0">
					<div className="w-10 h-1 bg-outline-variant rounded-full" />
				</div>

				{/* Header */}
				<div className="flex-shrink-0 px-6 pt-2 pb-3">
					<div className="flex items-center justify-between gap-3">
						{/* Back button (category mode → configurator view) */}
						{isCategoryMode && state.view === "configurator" ? (
							<button
								type="button"
								onClick={() =>
									dispatch({ type: "BACK_TO_LIST" })
								}
								className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center active:scale-90 transition-transform flex-shrink-0">
								<Icon
									name="arrow_back"
									className="text-on-surface text-lg"
								/>
							</button>
						) : (
							<div className="flex-1">
								<p className="text-[10px] font-bold uppercase tracking-widest text-primary leading-none">
									{isCategoryMode ? "Danh mục" : "Sản phẩm"}
								</p>
								<h3 className="font-black text-on-surface text-base uppercase leading-tight mt-0.5 line-clamp-1">
									{headerTitle}
								</h3>
							</div>
						)}

						{isCategoryMode && state.view === "configurator" && (
							<div className="flex-1 min-w-0">
								<p className="font-black text-on-surface text-base uppercase leading-tight line-clamp-1">
									{headerTitle}
								</p>
							</div>
						)}

						<button
							type="button"
							onClick={onClose}
							className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center active:scale-90 transition-transform flex-shrink-0">
							<Icon
								name="close"
								className="text-on-surface text-lg"
							/>
						</button>
					</div>
				</div>

				{/* Scrollable body */}
				<div className="overflow-y-auto flex-1 px-6 pb-4 hide-scrollbar">
					{isCategoryMode && state.view === "product-list"
						? renderProductList()
						: renderConfigurator()}
				</div>

				{/* Sticky footer (only in configurator view) */}
				{state.view === "configurator" && (
					<div className="flex-shrink-0 px-6 pb-8 pt-4 border-t border-outline-variant/20 flex items-center gap-4">
						<div>
							<p className="text-xs text-on-surface-variant font-semibold">
								Tổng
							</p>
							<p className="text-xl font-black text-primary">
								{formatVND(totalPrice)}
							</p>
						</div>
						<button
							type="button"
							onClick={handleAdd}
							disabled={
								state.submitting || (!canAdd && hasComponents)
							}
							className={clsx(
								"flex-1 h-14 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all",
								canAdd && !state.submitting
									? "bg-gradient-to-r from-primary to-primary-container"
									: "bg-outline/30 cursor-not-allowed",
							)}>
							{state.submitting ? (
								<span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
							) : (
								<>
									<Icon
										name="add_shopping_cart"
										className="text-xl"
									/>
									THÊM VÀO GIỎ
								</>
							)}
						</button>
					</div>
				)}
			</div>
		</>
	);
}
