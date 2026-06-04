"use client";

import { Check, ChevronDown, ExternalLink, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface KitOption {
	id: string;
	name: string;
	slug: string;
	base_price?: number;
	stock_quantity?: number | null;
	product_variants?: {
		id: string;
		variant_name: string;
		stock_quantity: number;
		price_adjustment: number;
	}[];
	product_components?: {
		id: string;
		component_group: string;
		is_required: boolean;
		products?: { id: string; name: string; slug: string } | null;
	}[];
}

const STORE_ORIGIN =
	process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3000";

function formatVND(n: number) {
	return new Intl.NumberFormat("vi-VN", {
		style: "currency",
		currency: "VND",
	}).format(n);
}

interface KitSelectorProps {
	value: string;
	onChange: (id: string) => void;
	options: KitOption[];
	loading: boolean;
}

export default function KitSelector({
	value,
	onChange,
	options,
	loading,
}: KitSelectorProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [prefetched, setPrefetched] = useState<KitOption | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const fromOptions = options.find((k) => k.id === value) ?? null;
	const selected = fromOptions ?? prefetched;
	const filtered = options.filter(
		(k) =>
			k.name.toLowerCase().includes(search.toLowerCase()) ||
			k.slug.toLowerCase().includes(search.toLowerCase()),
	);

	const totalStock = selected?.stock_quantity ?? 0;
	const isOutOfStock = totalStock === 0;

	// When value is set but not yet in the options list (e.g. pre-existing parent_product_id),
	// fetch that single kit so the detail card can render immediately.
	useEffect(() => {
		if (!value) {
			setPrefetched(null);
			return;
		}
		if (fromOptions) {
			setPrefetched(null); // options already have it — no need for prefetch
			return;
		}
		let cancelled = false;
		fetch(`/api/products/${value}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (!cancelled && data) setPrefetched(data as KitOption);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [value, fromOptions]);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
		if (open) {
			setSearch("");
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [open]);

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				disabled={loading}
				onClick={() => setOpen((v) => !v)}
				className="w-full flex items-center justify-between border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 transition-colors">
				{loading ? (
					<span className="text-slate-400">Loading kits…</span>
				) : selected ? (
					<span className="font-medium text-slate-900 truncate">
						{selected.name}
					</span>
				) : (
					<span className="text-slate-400">Search and select a kit…</span>
				)}
				<ChevronDown
					className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
				/>
			</button>

			{/* Selected kit detail card */}
			{selected && !open && (
				<div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
					<div className="flex items-start justify-between px-3 pt-3 pb-2">
						<div className="min-w-0 flex-1">
							<p className="text-sm font-semibold text-blue-900 truncate">
								{selected.name}
							</p>
							<a
								href={`${STORE_ORIGIN}/shop/${selected.slug}`}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-500 hover:text-blue-700 hover:underline mt-0.5">
								/{selected.slug}
								<ExternalLink className="w-3 h-3" />
							</a>
						</div>
						<button
							type="button"
							onClick={() => onChange("")}
							className="p-1 hover:bg-blue-100 rounded text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0 ml-2">
							<X className="w-3.5 h-3.5" />
						</button>
					</div>

					<div className="flex items-center gap-3 px-3 pb-2 border-b border-blue-100">
						<div className="text-xs text-blue-700">
							<span className="font-medium">Base price: </span>
							{selected.base_price !== undefined
								? formatVND(selected.base_price)
								: "—"}
						</div>
						<span
							className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${isOutOfStock ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
							{isOutOfStock ? "Out of stock" : `In stock (${totalStock})`}
						</span>
					</div>

					{selected.product_variants &&
						selected.product_variants.length > 0 && (
							<div className="px-3 py-2 border-b border-blue-100">
								<p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 mb-1.5">
									Variants ({selected.product_variants.length})
								</p>
								<div className="flex flex-wrap gap-1.5">
									{selected.product_variants.map((v) => (
										<span
											key={v.id}
											className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${v.stock_quantity === 0 ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-white text-slate-700 border-blue-200"}`}>
											{v.variant_name}
											{v.stock_quantity === 0 && (
												<span className="text-red-400">· sold out</span>
											)}
										</span>
									))}
								</div>
							</div>
						)}

					{selected.product_components &&
						selected.product_components.length > 0 && (
							<div className="px-3 py-2">
								<p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 mb-1.5">
									Components ({selected.product_components.length})
								</p>
								<div className="space-y-1">
									{selected.product_components.map((c) => (
										<div
											key={c.id}
											className="flex items-center gap-2 text-[11px]">
											<span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-medium text-[10px]">
												{c.component_group}
											</span>
											<span className="text-slate-600 truncate">
												{c.products?.name ?? "Unknown"}
											</span>
											{c.is_required && (
												<span className="text-[9px] font-bold uppercase text-red-500">
													required
												</span>
											)}
										</div>
									))}
								</div>
							</div>
						)}
				</div>
			)}

			{open && (
				<div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
					<div className="p-2 border-b border-slate-100">
						<input
							ref={inputRef}
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search by name or slug…"
							className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<ul className="max-h-48 overflow-y-auto">
						{filtered.length === 0 ? (
							<li className="px-3 py-4 text-sm text-slate-400 text-center">
								No kits found
							</li>
						) : (
							filtered.map((k) => (
								<li key={k.id}>
									<button
										type="button"
										onClick={() => {
											onChange(k.id);
											setOpen(false);
										}}
										className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors">
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-slate-900 truncate">
												{k.name}
											</p>
											<p className="text-xs font-mono text-slate-400 truncate">
												/{k.slug}
											</p>
										</div>
										{k.id === value && (
											<Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
										)}
									</button>
								</li>
							))
						)}
					</ul>
				</div>
			)}
		</div>
	);
}
