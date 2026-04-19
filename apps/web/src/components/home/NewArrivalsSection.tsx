import type { ShopProduct } from "@/app/api/products/route";
import { formatVND } from "@/lib/currency";
import { getNewestProducts } from "@/lib/products-server";
import Link from "next/link";

function ProductItem({
	product,
	index,
}: {
	product: ShopProduct;
	index: number;
}) {
	const isFirst = index === 0;

	return (
		<Link
			href={`/shop/${product.slug}`}
			className={`flex flex-col gap-4 ${!isFirst ? "ml-8" : ""}`}>
			<div
				className={`relative flex items-center justify-center overflow-hidden ${
					isFirst
						? "bg-surface-container-high aspect-square p-8"
						: "bg-surface-container-low aspect-[4/5] p-12"
				}`}>
				<span className="text-[8rem] font-black uppercase tracking-tighter text-on-surface/5 leading-none">
					{product.name.charAt(0)}
				</span>
				{isFirst && (
					<div className="absolute top-4 left-4 bg-primary text-on-primary text-[8px] font-bold px-2 py-1 tracking-tighter uppercase">
						MỚI
					</div>
				)}
			</div>
			<div className="flex justify-between items-start">
				<div>
					<h4 className="font-extrabold text-lg uppercase tracking-tight">
						{product.name}
					</h4>
					<p className="text-xs text-on-surface-variant uppercase font-bold tracking-wide mt-0.5">
						{product.category}
					</p>
				</div>
				<span className="font-extrabold text-primary">
					{formatVND(product.min_price)}
				</span>
			</div>
		</Link>
	);
}

export async function NewArrivalsSection() {
	const products = await getNewestProducts(2);

	return (
		<section className="py-12 px-6">
			<div className="flex items-baseline justify-between mb-8">
				<h2 className="text-2xl font-black tracking-tight uppercase">
					Hàng Mới Về
				</h2>
				<Link
					href="/shop"
					className="text-[10px] font-bold text-primary underline underline-offset-4 uppercase tracking-widest">
					XEM TẤT CẢ
				</Link>
			</div>
			<div className="flex flex-col gap-12">
				{products.map((product, index) => (
					<ProductItem
						key={product.id}
						product={product}
						index={index}
					/>
				))}
			</div>
		</section>
	);
}
