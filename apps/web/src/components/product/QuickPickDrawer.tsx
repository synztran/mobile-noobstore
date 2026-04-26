"use client";

import type { AddToCartRequest } from "@/app/api/cart/add/route";
import type { ConfiguratorGroup } from "@/app/api/products/[slug]/configurator/route";
import type { ShopProduct } from "@/app/api/products/route";
import {
	ProductConfigurator,
	Thumbnail,
} from "@/components/product/ProductConfigurator";
import Icon from "@/components/ui/Icon";
import { usePreventScroll } from "@/hooks/usePreventScroll";
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
	configuratorByProductId: Record<string, ConfiguratorGroup[]>;
	groups: ConfiguratorGroup[];
	/** group label → selected variant id */
	selections: Record<string, string>;
	loadingProducts: boolean;
	loadingConfigurator: boolean;
	submitting: boolean;
}

type DrawerAction =
	| { type: "RESET" }
	| { type: "LOAD_QUICK_PICK_START"; view: DrawerView }
	| {
			type: "LOAD_QUICK_PICK_DONE";
			products: ShopProduct[];
			configuratorByProductId: Record<string, ConfiguratorGroup[]>;
			activeProduct: ShopProduct | null;
			view: DrawerView;
	  }
	| { type: "SELECT_PRODUCT"; product: ShopProduct }
	| { type: "BACK_TO_LIST" }
	| { type: "SELECT"; group: string; variantId: string }
	| { type: "SUBMIT_START" }
	| { type: "SUBMIT_DONE" };

const INITIAL_STATE: DrawerState = {
	view: "product-list",
	products: [],
	activeProduct: null,
	configuratorByProductId: {},
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
		case "LOAD_QUICK_PICK_START":
			return {
				...state,
				products: action.view === "product-list" ? [] : state.products,
				activeProduct:
					action.view === "configurator" ? state.activeProduct : null,
				groups: action.view === "configurator" ? state.groups : [],
				loadingProducts: action.view === "product-list",
				loadingConfigurator: action.view === "configurator",
				view: action.view,
			};
		case "LOAD_QUICK_PICK_DONE": {
			const resolvedGroups = action.activeProduct
				? (action.configuratorByProductId[action.activeProduct.id] ??
					[])
				: [];
			return {
				...state,
				products: action.products,
				configuratorByProductId: action.configuratorByProductId,
				activeProduct: action.activeProduct,
				groups: resolvedGroups,
				selections: {},
				loadingProducts: false,
				loadingConfigurator: false,
				view: action.view,
			};
		}
		case "SELECT_PRODUCT":
			return {
				...state,
				activeProduct: action.product,
				groups: state.configuratorByProductId[action.product.id] ?? [],
				selections: {},
				loadingConfigurator: false,
				view: "configurator",
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

	// ref to avoid duplicate fetches for the same subject
	const fetchedRequestKey = useRef<string | null>(null);

	type QuickPickResponse = {
		products: ShopProduct[];
		configuratorByProductId: Record<string, ConfiguratorGroup[]>;
		activeProduct: ShopProduct | null;
		total: number;
	};

	// ── Unified quick-pick fetch (products + configurators) ──────────────
	useEffect(() => {
		if (!isOpen) return;

		const view: DrawerView = isCategoryMode
			? "product-list"
			: "configurator";
		const requestKey = isCategoryMode
			? `category:${propCategory?.slug ?? ""}`
			: `product:${propProduct?.id ?? ""}`;

		if (requestKey.endsWith(":")) return;
		if (fetchedRequestKey.current === requestKey) return;

		fetchedRequestKey.current = requestKey;
		dispatch({ type: "LOAD_QUICK_PICK_START", view });

		const query = new URLSearchParams();
		if (isCategoryMode && propCategory?.slug) {
			query.set("categorySlug", propCategory.slug);
		}
		if (!isCategoryMode && propProduct?.id) {
			query.set("productId", propProduct.id);
		}

		fetch(`/api/products/quick-pick?${query.toString()}`)
			.then((r) => r.json())
			.then((res: QuickPickResponse) => {
				dispatch({
					type: "LOAD_QUICK_PICK_DONE",
					products: res.products ?? [],
					configuratorByProductId: res.configuratorByProductId ?? {},
					activeProduct: isCategoryMode
						? null
						: (res.activeProduct ?? propProduct ?? null),
					view,
				});
			})
			.catch(() => {
				dispatch({
					type: "LOAD_QUICK_PICK_DONE",
					products: [],
					configuratorByProductId: {},
					activeProduct: isCategoryMode
						? null
						: (propProduct ?? null),
					view,
				});
				toast.error(
					isCategoryMode
						? "Không thể tải sản phẩm"
						: "Không thể tải cấu hình sản phẩm",
				);
			});
	}, [isOpen, isCategoryMode, propCategory?.slug, propProduct?.id]);

	// ── Reset when closed ────────────────────────────────────────────────
	useEffect(() => {
		if (!isOpen) {
			fetchedRequestKey.current = null;
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

	// ── Prevent body scroll when drawer is open ───────────────────────────
	usePreventScroll(isOpen);

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
					<Thumbnail
						src={activeProduct.thumbnail}
						alt={activeProduct.name}
						className="w-20 h-20 rounded-xl"
					/>
					<div className="flex-1 min-w-0">
						<p className="font-black text-on-surface uppercase leading-tight line-clamp-1">
							{activeProduct.name}
						</p>
						<p className="text-sm font-bold text-primary mt-0.5">
							{formatVND(activeProduct.base_price)}
						</p>
					</div>
				</div>
			)}
			<ProductConfigurator
				groups={state.groups}
				variants={activeProduct?.variants ?? []}
				selections={state.selections}
				loadingConfigurator={state.loadingConfigurator}
				onSelect={(group, variantId) =>
					dispatch({ type: "SELECT", group, variantId })
				}
			/>
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
						{isCategoryMode && state.view === "configurator" && (
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
						)}

						<div className="flex-1 min-w-0">
							<span className="text-sm font-bold uppercase tracking-widest text-primary leading-none">
								Thêm nhanh sản phẩm
							</span>
						</div>
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
					<div className="flex-shrink-0 px-6 pb-8 pt-4 border-t border-outline-variant/20 flex items-center gap-8">
						<div>
							<p className="text-base text-on-surface-variant font-semibold">
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
