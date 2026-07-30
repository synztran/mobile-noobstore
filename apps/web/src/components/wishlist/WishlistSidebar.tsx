"use client";

import Icon from "@/components/ui/Icon";
import { usePreventScroll } from "@/hooks/usePreventScroll";
import { useWishlist } from "@/hooks/useWishlist";
import { formatVND } from "@/lib/currency";
import Image from "next/image";
import Link from "next/link";

interface WishlistSidebarProps {
	drawerOpen: boolean;
	onClose: () => void;
}

function WishlistItemSkeleton() {
	return (
		<div className="animate-pulse bg-surface-container rounded-2xl p-3 flex gap-3">
			<div className="w-16 h-16 rounded-xl bg-surface-container-high flex-shrink-0" />
			<div className="flex-1 space-y-2">
				<div className="h-3 w-3/4 rounded-full bg-surface-container-high" />
				<div className="h-3 w-1/2 rounded-full bg-surface-container-high" />
				<div className="h-3 w-1/3 rounded-full bg-surface-container-high" />
			</div>
		</div>
	);
}

export function WishlistSidebar({ drawerOpen, onClose }: WishlistSidebarProps) {
	const { items, loading, busy, removeFromWishlist } = useWishlist();

	usePreventScroll(drawerOpen);

	return (
		<>
			<div
				className={`fixed inset-0 z-[80] bg-on-surface/25 backdrop-blur-sm transition-opacity duration-300 ${
					drawerOpen
						? "opacity-100 pointer-events-auto"
						: "opacity-0 pointer-events-none"
				}`}
				onClick={onClose}
			/>

			<aside
				aria-label="Wishlist sidebar"
				className={`fixed right-0 top-0 h-full w-[88vw] max-w-md z-[81] bg-surface shadow-2xl transition-transform duration-300 ease-out ${
					drawerOpen ? "translate-x-0" : "translate-x-full"
				}`}>
				<div className="h-full flex flex-col">
					<div className="px-4 py-4 border-b border-outline-variant/20 flex items-center justify-between">
						<div>
							<p className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant">
								Wishlist
							</p>
							<h2 className="text-lg font-black text-on-surface">
								Sản phẩm yêu thích
							</h2>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="rounded-xl border border-outline-variant/40 bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface transition-all active:scale-90"
							aria-label="Close wishlist">
							Đóng
						</button>
					</div>

					<div
						className="flex-1 overflow-y-auto touch-pan-y p-4 space-y-3"
						data-allow-scroll>
						{loading ? (
							<>
								<WishlistItemSkeleton />
								<WishlistItemSkeleton />
							</>
						) : null}

						{!loading && items.length === 0 ? (
							<div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center px-5">
								<div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-3">
									<Icon
										name="favorite_border"
										className="text-[24px] text-outline-variant"
									/>
								</div>
								<p className="font-bold text-on-surface">
									Chưa có sản phẩm yêu thích
								</p>
								<p className="text-xs text-on-surface-variant mt-1">
									Hãy thêm sản phẩm để xem lại nhanh sau này.
								</p>
								<Link
									href="/shop"
									onClick={onClose}
									className="mt-4 h-10 px-4 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-wider inline-flex items-center justify-center">
									Khám phá sản phẩm
								</Link>
							</div>
						) : null}

						{!loading && items.length > 0
							? items.map((item) => {
									const product = item.product;
									return (
										<div
											key={item.id}
											className="bg-surface-container-lowest rounded-2xl p-3 flex gap-3 items-start">
											<div className="w-16 h-16 bg-surface-container rounded-xl flex-shrink-0 relative overflow-hidden">
												{product?.thumbnail ? (
													<Image
														src={product.thumbnail}
														alt={product.name}
														fill
														className="object-cover"
														sizes="64px"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<Icon
															name="image_not_supported"
															className="text-[18px] text-outline-variant"
														/>
													</div>
												)}
											</div>

											<div className="flex-1 min-w-0">
												<p className="font-bold text-sm text-on-surface truncate">
													{product?.name ??
														"Sản phẩm không khả dụng"}
												</p>
												{product?.brand ? (
													<p className="text-[11px] uppercase tracking-wider text-on-surface-variant mt-1">
														{product.brand}
													</p>
												) : null}
												<p className="font-black text-primary text-sm mt-1">
													{product
														? formatVND(
																product.base_price,
															)
														: "--"}
												</p>

												<div className="mt-2 flex items-center gap-2">
													{product?.slug ? (
														<Link
															href={`/shop/${product.slug}`}
															onClick={onClose}
															className="h-8 px-3 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider inline-flex items-center">
															Xem chi tiết
														</Link>
													) : null}
													<button
														type="button"
														onClick={() =>
															void removeFromWishlist(
																item.product_id,
															)
														}
														disabled={busy}
														className="h-8 px-3 rounded-lg bg-surface-container text-on-surface-variant text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 disabled:opacity-60">
														<Icon
															name="close"
															className="text-[14px]"
														/>
														Xóa
													</button>
												</div>
											</div>
										</div>
									);
								})
							: null}
					</div>
				</div>
			</aside>
		</>
	);
}

export default WishlistSidebar;
