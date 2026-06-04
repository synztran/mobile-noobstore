"use client";

import type { AddToCartRequest } from "@/app/api/cart/add/route";
import type { ComponentVariantRule, ConfiguratorGroup } from "@/app/api/products/[slug]/configurator/route";
import type { ShopProduct } from "@/app/api/products/route";
import { PreOrderBanner } from "@/components/product/PreOrderBanner";
import { ProductConfigurator } from "@/components/product/ProductConfigurator";
import { Thumbnail } from "@/components/ui/Thumbnail";
import {
	INITIAL_STATE,
	reduce,
	type DrawerView,
} from "@/components/product/quick-pick/quickPickDrawerReducer";
import Icon from "@/components/ui/Icon";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { formatVND } from "@/lib/currency";
import type { SelectedComponent } from "@/lib/data";
import type { CategoryItem } from "@/lib/products-server";
import { toast } from "@/lib/toast";
import { useCartStore } from "@/store";
import { useAddToCart } from "@/lib/react-query/cart/api/useCartMutations";
import { useQuickPick } from "@/lib/react-query/product/api/useProductQueries";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useMemo, useReducer } from "react";

// ─── Add to Cart Button ─────────────────────────────────────────────────────

type AddToCartButtonProps = {
	isSubmitting: boolean;
	isFetchingVariants: boolean;
	canAdd: boolean;
	hasComponents: boolean;
	isInvalidPrice: boolean;
	isPreOrder: boolean;
	onClick: () => void;
};

function AddToCartButton({
	isSubmitting,
	isFetchingVariants,
	canAdd,
	hasComponents,
	isInvalidPrice,
	isPreOrder,
	onClick,
}: AddToCartButtonProps) {
	const isLoading = isSubmitting || isFetchingVariants;
	const isDisabled =
		isLoading || isInvalidPrice || (!canAdd && hasComponents);
	const isActive = !isDisabled;

	function renderLabel() {
		if (isLoading) {
			return (
				<span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
			);
		}
		if (isInvalidPrice) {
			return "Chưa có giá";
		}
		if (!canAdd && hasComponents) {
			return "Vui lòng chọn";
		}
		if (isPreOrder) {
			return (
				<>
					<Icon name="schedule" className="text-xl" />
					ĐẶT TRƯỚC
				</>
			);
		}
		return (
			<>
				<Icon name="add_shopping_cart" className="text-xl" />
				THÊM VÀO GIỎ
			</>
		);
	}

	return (
		<button
			type="button"
			onClick={onClick}
			disabled={isDisabled}
			className={clsx(
				"flex-1 h-14 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all",
				isActive
					? "bg-gradient-to-r from-primary to-primary-container"
					: "bg-outline/30 cursor-not-allowed",
			)}>
			{renderLabel()}
		</button>
	);
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
	const { addItem, openCart, items: cartItems } = useCartStore();

	type QuickPickResponse = {
		products: ShopProduct[];
		configuratorByProductId: Record<string, ConfiguratorGroup[]>;
		activeProduct: ShopProduct | null;
		total: number;
	};

	const view: DrawerView = isCategoryMode ? "product-list" : "configurator";
	const requestKey = isCategoryMode
		? `category:${propCategory?.slug ?? ""}`
		: `product:${propProduct?.id ?? ""}`;
	const canFetchQuickPick = isOpen && !requestKey.endsWith(":");

	const quickPickQuery = useQuickPick(requestKey, isOpen);

	useEffect(() => {
		if (!canFetchQuickPick) return;
		dispatch({ type: "LOAD_QUICK_PICK_START", view });
	}, [canFetchQuickPick, requestKey, view]);

	useEffect(() => {
		if (!isOpen || !quickPickQuery.data) return;
		dispatch({
			type: "LOAD_QUICK_PICK_DONE",
			products: quickPickQuery.data.products ?? [],
			configuratorByProductId:
				quickPickQuery.data.configuratorByProductId ?? {},
			rulesByProductId: quickPickQuery.data.rulesByProductId ?? {},
			activeProduct: isCategoryMode
				? null
				: ((quickPickQuery.data.activeProduct?.id
						? quickPickQuery.data.activeProduct
						: propProduct) ?? null),
			view,
		});
	}, [isOpen, quickPickQuery.data, isCategoryMode, propProduct, view]);

	useEffect(() => {
		if (!quickPickQuery.isError) return;
		dispatch({
			type: "LOAD_QUICK_PICK_DONE",
			products: [],
			configuratorByProductId: {},
			rulesByProductId: {},
			activeProduct: isCategoryMode ? null : (propProduct ?? null),
			view,
		});
		toast.error(
			isCategoryMode
				? "Không thể tải sản phẩm"
				: "Không thể tải cấu hình sản phẩm",
		);
	}, [quickPickQuery.isError, isCategoryMode, propProduct, view]);

	// ── Reset when closed ────────────────────────────────────────────────
	useEffect(() => {
		if (!isOpen) {
			dispatch({ type: "RESET" });
		}
	}, [isOpen]);

	const addToCartMutation = useAddToCart();

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

	// ── Disabled variants via conditional rules ───────────────────────────
	const disabledVariantIds = useMemo(() => {
		const disabled = new Set<string>();
		if (state.rules.length === 0) return disabled;
		const selectedIds = new Set(Object.values(state.selections));
		// variant → component_product_id lookup
		const variantToProduct = new Map<string, string>();
		for (const group of state.groups) {
			for (const v of group.variants) {
				if (v.component_product_id)
					variantToProduct.set(v.id, v.component_product_id);
			}
		}
		// product → all its variant IDs lookup
		const productVariants = new Map<string, string[]>();
		for (const [variantId, productId] of variantToProduct) {
			if (!productVariants.has(productId)) productVariants.set(productId, []);
			productVariants.get(productId)!.push(variantId);
		}
		for (const rule of state.rules as ComponentVariantRule[]) {
			if (!selectedIds.has(rule.condition_variant_id)) continue;
			const allVariants = productVariants.get(rule.target_component_product_id) ?? [];
			const allowed = new Set(rule.allowed_variant_ids);
			for (const vid of allVariants) {
				if (!allowed.has(vid)) disabled.add(vid);
			}
		}
		return disabled;
	}, [state.rules, state.selections, state.groups]);

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
	const isSubmitting = useMemo(
		() => state.submitting || addToCartMutation.isPending,
		[state.submitting, addToCartMutation.isPending],
	);
	const isFetchingVariants =
		quickPickQuery.isFetching || state.loadingConfigurator;

	const isInvalidPrice = totalPrice <= 0;

	// ── Pre-order: resolve config for the currently selected variant ─────
	// For simple variants: check __variant__ selection against product.variants
	// For component groups: check if any selected group variant is pre-order
	const selectedPreOrderConfig = useMemo(() => {
		if (!activeProduct) return null;
		// Simple variant path
		const simpleSelectedId = state.selections["__variant__"];
		if (simpleSelectedId) {
			const v = activeProduct.variants.find(
				(v) => v.id === simpleSelectedId,
			);
			if (v?.is_pre_order && v.pre_order_config)
				return v.pre_order_config;
		}
		// Component group path — return config of first pre-order selected variant
		for (const group of state.groups) {
			const selectedId = state.selections[group.component_group];
			if (!selectedId) continue;
			const v = group.variants.find((gv) => gv.id === selectedId);
			if (v?.is_pre_order && v.pre_order_config)
				return v.pre_order_config;
		}
		return null;
	}, [activeProduct, state.selections, state.groups]);

	// ── Add to cart ───────────────────────────────────────────────────────
	const handleAdd = async () => {
		if (isInvalidPrice) {
			toast.error(
				"Sản phẩm chưa được cập nhật giá, vui lòng liên hệ shop",
			);
			return;
		}
		if (!activeProduct) return;
		if (!canAdd) {
			toast.error(`Vui lòng chọn: ${missingRequired.join(", ")}`);
			return;
		}

		const selectedVariantId = state.selections["__variant__"] ?? null;
		const isKit = activeProduct.product_type === "kit";

		// Resolve the selected simple variant early — needed for variant-level stock check
		const selectedSimpleVariant = !hasComponents
			? (activeProduct.variants.find((v) => v.id === selectedVariantId) ??
				null)
			: null;

		// ── Stock validation ─────────────────────────────────────────────
		if (isKit) {
			// For kit products: validate each selected component variant against
			// how many times that variant is already used across all cart kit items.
			const insufficientComponents: string[] = [];
			for (const group of state.groups) {
				const selectedId = state.selections[group.component_group];
				if (!selectedId) continue;
				const v = group.variants.find((gv) => gv.id === selectedId);
				if (!v) continue;

				// Count how many of this component variant are already in the cart
				const usedQty = cartItems.reduce((sum, cartItem) => {
					return (
						sum +
						(cartItem.components ?? []).filter(
							(c) => c.variant_id === v.id,
						).length
					);
				}, 0);

				if (usedQty + 1 > v.stock_quantity) {
					insufficientComponents.push(
						`"${v.variant_name}" (còn ${v.stock_quantity})`,
					);
				}
			}
			if (insufficientComponents.length > 0) {
				toast.warning(
					`Không đủ hàng: ${insufficientComponents.join(", ")}`,
				);
				return;
			}
		} else {
			// For standard products: check variant-level stock
			const availableStock =
				selectedSimpleVariant?.stock_quantity ??
				activeProduct.stock_quantity;
			const existingCartItem = cartItems.find(
				(i) =>
					i.product.id === activeProduct.id &&
					(i.variant?.id ?? null) === selectedVariantId,
			);
			const currentQty = existingCartItem?.quantity ?? 0;
			if (currentQty + 1 > availableStock) {
				toast.warning(`Chỉ còn ${availableStock} sản phẩm trong kho`);
				return;
			}
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
						is_pre_order: v.is_pre_order ?? false,
					},
				];
			},
		);

		try {
			const body: AddToCartRequest = {
				parent_product_id: activeProduct.id,
				selected_variant_ids: components.map((c) => c.variant_id),
			};
			await addToCartMutation.mutateAsync(body);
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
			selectedSimpleVariant,
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
									sizes="64px"
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
		<div className="min-h-0 flex flex-col gap-3">
			{/* Selected product header */}
			{activeProduct && (
				<div className="flex gap-3 items-center bg-surface-container rounded-2xl p-3">
					<Thumbnail
						src={activeProduct.thumbnail}
						alt={activeProduct.name}
						className="w-20 h-20 rounded-xl"
					/>
					<div className="flex-1 min-w-0">
						<p className="font-black text-on-surface uppercase leading-tight line-clamp-2">
							{activeProduct.name}
						</p>
						<p className="text-sm font-bold text-primary mt-0.5">
							{formatVND(activeProduct.base_price)}
						</p>
					</div>
				</div>
			)}
			<div className="min-h-0 flex flex-col gap-4 pb-2">
				<ProductConfigurator
					groups={state.groups}
					variants={activeProduct?.variants ?? []}
					selections={state.selections}
					loadingConfigurator={state.loadingConfigurator}
					basePrice={activeProduct?.base_price}
					disabledVariantIds={disabledVariantIds}
					onSelect={(group, variantId) =>
						dispatch({ type: "SELECT", group, variantId })
					}
				/>
				{/* Pre-order info banner — shown when a pre-order variant is selected */}
				{selectedPreOrderConfig && (
					<PreOrderBanner config={selectedPreOrderConfig} />
				)}
			</div>
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
					"fixed left-0 right-0 z-[999] bg-surface rounded-t-3xl transition-all duration-300 ease-out max-h-[80dvh] flex flex-col",
					isOpen ? "bottom-0" : "-bottom-full",
				)}>
				{/* Handle */}
				<div className="flex justify-center pt-3 pb-1 flex-shrink-0">
					<div className="w-10 h-1 bg-outline-variant rounded-full" />
				</div>

				{/* Header */}
				<div className="flex-shrink-0 px-4 py-2">
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
						{/* <button
							type="button"
							onClick={onClose}
							className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center active:scale-90 transition-transform flex-shrink-0">
							<Icon
								name="close"
								className="text-on-surface text-lg"
							/>
						</button> */}
					</div>
				</div>

				{/* Scrollable body */}
				<div
					data-allow-scroll
					className="flex-1 px-4 pb-4 min-h-0 max-h-full overflow-y-auto overscroll-contain">
					{isCategoryMode && state.view === "product-list"
						? renderProductList()
						: renderConfigurator()}
				</div>

				{/* Sticky footer (only in configurator view) */}
				{state.view === "configurator" && (
					<div className="flex-shrink-0 px-4 py-4 border-t border-outline-variant/20 flex items-center gap-8">
						<div>
							<p className="text-base text-on-surface-variant font-semibold">
								Tạm tính
							</p>
							<p className="text-xl font-black text-primary">
								{formatVND(totalPrice)}
							</p>
						</div>
						<AddToCartButton
							isSubmitting={isSubmitting}
							isFetchingVariants={isFetchingVariants}
							canAdd={canAdd}
							hasComponents={hasComponents}
							isInvalidPrice={isInvalidPrice}
							isPreOrder={selectedPreOrderConfig !== null}
							onClick={handleAdd}
						/>
					</div>
				)}
			</div>
		</>
	);
}
