"use client";

import { Download, RefreshCw, Search, ShoppingBag, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { formatVND } from "@/lib/currency";

interface CartUser {
	id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
}

interface CartItemDisplay {
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
	children: CartItemDisplay[];
}

interface Cart {
	id: string;
	user_id: string | null;
	created_at: string | null;
	updated_at: string | null;
	users: CartUser | null;
	cart_items: CartItemDisplay[];
	itemCount: number;
	cartTotal: number;
	cartStatus: string;
}

interface Props {
	carts: Cart[];
	count: number;
	currentPage: number;
	totalPages: number;
	searchBy: string;
	q: string;
	status: string;
	sortBy: string;
	sortDir: string;
}

const STATUS_LABELS: Record<string, string> = {
	guest: "Khách",
	active: "Đang hoạt động",
	abandoned: "Bỏ quên",
	converted: "Đã mua hàng",
};

const STATUS_COLORS: Record<string, string> = {
	guest: "bg-slate-100 text-slate-700",
	active: "bg-green-100 text-green-800",
	abandoned: "bg-yellow-100 text-yellow-800",
	converted: "bg-blue-100 text-blue-800",
};

const FILTER_TABS = [
	{ key: "", label: "Tất cả" },
	{ key: "guest", label: "Khách" },
	{ key: "registered", label: "Đã đăng ký" },
	{ key: "active", label: "Đang hoạt động" },
	{ key: "abandoned", label: "Bỏ quên" },
	{ key: "converted", label: "Đã mua hàng" },
];

export default function CartsClient({
	carts,
	count,
	currentPage,
	totalPages,
	searchBy,
	q,
	status,
	sortBy,
	sortDir,
}: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [, startTransition] = useTransition();

	function buildUrl(p: number, s: string, newQ: string, by: string, sort?: string, dir?: string) {
		const params = new URLSearchParams();
		if (newQ) params.set("q", newQ);
		if (by !== "user") params.set("by", by);
		if (s) params.set("status", s);
		if (sort) params.set("sort", sort);
		if (dir) params.set("dir", dir);
		if (p > 1) params.set("page", String(p));
		const qs = params.toString();
		return `/carts${qs ? `?${qs}` : ""}`;
	}

	function handleSort(colKey: string) {
		const newDir = sortBy === colKey && sortDir === "asc" ? "desc" : "asc";
		const url = buildUrl(1, status, q, searchBy, colKey, newDir);
		startTransition(() => router.replace(url));
	}

	function SortIcon({ column }: { column: string }) {
		if (sortBy !== column) return <span className="text-slate-300 ml-1">↕</span>;
		return <span className="text-blue-600 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
	}

	function exportCSV() {
		const headers = ["Cart ID", "Status", "Name", "Email", "Items", "Total", "Last Activity"];
		const rows = carts.map((cart) => {
			const user = cart.users;
			const name = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "—";
			return [
				cart.id,
				STATUS_LABELS[cart.cartStatus] ?? cart.cartStatus,
				name,
				user?.email ?? "(guest)",
				String(cart.itemCount),
				String(cart.cartTotal),
				cart.updated_at || cart.created_at || "",
			];
		});
		const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
		const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `carts-${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const handleSearch = useCallback(
		(value: string, by?: string) => {
			const params = new URLSearchParams(searchParams.toString());
			if (value) params.set("q", value);
			else params.delete("q");
			params.set("by", by ?? searchBy);
			params.delete("page");
			startTransition(() =>
				router.replace(`${pathname}?${params.toString()}`),
			);
		},
		[router, pathname, searchParams, searchBy],
	);

	const modalRef = useRef<HTMLDialogElement>(null);
	const [selectedCart, setSelectedCart] = useState<Cart | null>(null);
	const [autoRefresh, setAutoRefresh] = useState(false);
	const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (autoRefresh) {
			refreshIntervalRef.current = setInterval(() => {
				startTransition(() => router.refresh());
			}, 15_000);
		} else {
			if (refreshIntervalRef.current) {
				clearInterval(refreshIntervalRef.current);
				refreshIntervalRef.current = null;
			}
		}
		return () => {
			if (refreshIntervalRef.current) {
				clearInterval(refreshIntervalRef.current);
			}
		};
	}, [autoRefresh, router, startTransition]);

	function openDetail(cart: Cart) {
		setSelectedCart(cart);
		modalRef.current?.showModal();
	}

	function closeDetail() {
		setSelectedCart(null);
		modalRef.current?.close();
	}

	return (
		<>
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-3 mr-auto">
					<h1 className="text-3xl font-bold text-slate-900">
						Cart Monitoring
					</h1>
					<span className="text-xs text-slate-500">
						{count} carts
					</span>
				</div>
				<div className="flex items-center gap-3">
			<button
				type="button"
				onClick={exportCSV}
				className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-300 hover:bg-slate-50 text-slate-700"
			>
				<Download className="w-4 h-4" />
				CSV
			</button>
			<button
				type="button"
				onClick={() => setAutoRefresh(!autoRefresh)}
				className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
					autoRefresh
						? "border-blue-300 bg-blue-50 text-blue-700"
						: "border-slate-300 hover:bg-slate-50 text-slate-700"
				}`}
			>
				<RefreshCw className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`} />
				{autoRefresh ? "Auto" : "Auto"}
			</button>
			<div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
					<select
						defaultValue={searchBy}
						onChange={(e) => handleSearch(q, e.target.value)}
						className="border-r border-slate-300 bg-slate-50 text-sm text-slate-600 px-2 py-2 focus:outline-none"
					>
						<option value="user">User</option>
						<option value="cart">Cart ID</option>
					</select>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
						<input
							type="search"
							defaultValue={q}
							onChange={(e) => handleSearch(e.target.value)}
							placeholder={
								searchBy === "cart"
									? "Search by cart ID…"
									: "Search by name or email…"
							}
							className="pl-9 pr-4 py-2 text-sm w-56 focus:outline-none"
						/>
					</div>
				</div>
			</div>
			</div>

			<div className="flex items-center gap-1.5">
				{FILTER_TABS.map((tab) => {
					const isActive =
						(!tab.key && !status) ||
						tab.key === status;
					return (
						<a
							key={tab.key}
							href={buildUrl(1, tab.key, q, searchBy, sortBy, sortDir)}
							className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
								isActive
									? "bg-blue-600 text-white"
									: "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
							}`}
						>
							{tab.label}
						</a>
					);
				})}
			</div>

			<div className="bg-white rounded-lg shadow overflow-hidden">
				<table className="w-full">
					<thead className="bg-slate-50 border-b border-slate-200">
						<tr>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Cart Info
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Email
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Items
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Total
							</th>
							<th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
								Status
							</th>
							<th
								className="px-6 py-3 text-left text-sm font-semibold text-slate-900 cursor-pointer select-none hover:text-blue-600"
								onClick={() => handleSort("updated_at")}
							>
								<span className="inline-flex items-center">
									Last Activity
									<SortIcon column="updated_at" />
								</span>
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{carts.length > 0 ? (
							carts.map((cart) => {
								const user = cart.users;
								const items = cart.cart_items ?? [];
								const fullName =
									`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
									"—";
								return (
									<tr
										key={cart.id}
										className="hover:bg-slate-50 cursor-pointer"
										onClick={() => openDetail(cart)}
									>
										<td className="px-6 py-4 text-sm font-medium text-slate-900">
											{fullName}
											<br />
											<span className="text-xs text-slate-400 font-mono">
												{cart.id.slice(0, 8)}…
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{user?.email ?? (
												<span className="text-xs text-slate-400">
													(guest)
												</span>
											)}
										</td>
										<td className="px-6 py-4 text-sm text-slate-900">
											<span className="font-medium">
												{items.length}
											</span>
											<div className="flex flex-wrap gap-1 mt-1">
												{items
													.slice(0, 3)
													.map((item) => (
														<span
															key={item.id}
															className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
														>
															{item.product_name ??
																"Unknown"}
															{item.quantity >
																1 && (
																<span className="font-semibold text-slate-400">
																	x
																	{
																		item.quantity
																	}
																</span>
															)}
														</span>
													))}
												{items.length > 3 && (
													<span className="text-xs text-slate-400">
														+
														{items.length - 3}
														&nbsp;more
													</span>
												)}
											</div>
										</td>
										<td className="px-6 py-4 text-sm font-medium text-slate-900">
											{cart.cartTotal.toLocaleString(
												"vi-VN",
											)}
											₫
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
													STATUS_COLORS[
														cart.cartStatus
													] ??
													"bg-slate-100 text-slate-700"
												}`}
											>
												<ShoppingBag className="w-3 h-3" />
												{STATUS_LABELS[
													cart.cartStatus
												] ?? cart.cartStatus}
											</span>
										</td>
										<td className="px-6 py-4 text-sm text-slate-600">
											{cart.updated_at || cart.created_at
												? new Date(
														cart.updated_at ||
															cart.created_at!,
													).toLocaleString("vi-VN")
												: "—"}
										</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td
									colSpan={6}
									className="px-6 py-8 text-center text-slate-500"
								>
									No carts found
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-2">
					<span className="text-sm text-slate-500">
						{count} cart{count !== 1 ? "s" : ""} · Page{" "}
						{currentPage} of {totalPages}
					</span>
					<div className="flex items-center gap-1">
						<a
							href={buildUrl(
								currentPage - 1,
								status,
								q,
								searchBy,
								sortBy,
								sortDir,
							)}
							aria-disabled={currentPage === 1}
							className={`p-1.5 rounded-lg border border-slate-200 text-slate-600 ${
								currentPage === 1
									? "pointer-events-none opacity-40"
									: "hover:bg-slate-100"
							}`}
						>
							‹
						</a>
						{Array.from(
							{ length: totalPages },
							(_, i) => i + 1,
						)
							.filter(
								(p) =>
									p === 1 ||
									p === totalPages ||
									Math.abs(p - currentPage) <= 1,
							)
							.reduce<(number | "…")[]>(
								(acc, p, idx, arr) => {
									if (
										idx > 0 &&
										p - (arr[idx - 1] as number) > 1
									)
										acc.push("…");
									acc.push(p);
									return acc;
								},
								[],
							)
							.map((p, i) =>
								p === "…" ? (
									<span
										key={`e-${i}`}
										className="px-2 text-slate-400 text-sm"
									>
										…
									</span>
								) : (
									<a
										key={p}
										href={buildUrl(
											p,
											status,
											q,
											searchBy,
											sortBy,
											sortDir,
										)}
										className={`min-w-[2rem] h-8 flex items-center justify-center rounded-lg text-sm border ${
											p === currentPage
												? "bg-blue-600 text-white border-blue-600 font-medium"
												: "border-slate-200 hover:bg-slate-100"
										}`}
									>
										{p}
									</a>
								),
							)}
						<a
							href={buildUrl(
								currentPage + 1,
								status,
								q,
								searchBy,
								sortBy,
								sortDir,
							)}
							aria-disabled={currentPage === totalPages}
							className={`p-1.5 rounded-lg border border-slate-200 text-slate-600 ${
								currentPage === totalPages
									? "pointer-events-none opacity-40"
									: "hover:bg-slate-100"
							}`}
						>
							›
						</a>
					</div>
				</div>
			)}
		</div>

			<dialog
				ref={modalRef}
				className="modal modal-bottom sm:modal-middle"
				onClose={closeDetail}
			>
				<div className="modal-box max-w-2xl">
					<form method="dialog">
						<button className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">
							<X className="w-4 h-4" />
						</button>
					</form>

					{selectedCart && (
						<CartDetail cart={selectedCart} />
					)}
				</div>
				<form method="dialog" className="modal-backdrop">
					<button onClick={closeDetail}>close</button>
				</form>
			</dialog>
		</>
	);
}

function CartDetail({ cart }: { cart: Cart }) {
	const user = cart.users;
	const fullName =
		`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "—";

	return (
		<div className="space-y-5">
			<div className="flex items-center justify-between">
				<p className="text-xl font-bold text-slate-900">Cart Details</p>
				<span
					className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
						STATUS_COLORS[cart.cartStatus] ?? "bg-slate-100 text-slate-700"
					}`}
				>
					<ShoppingBag className="w-3 h-3" />
					{STATUS_LABELS[cart.cartStatus] ?? cart.cartStatus}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 rounded-lg p-4">
				<div>
					<p className="text-slate-500">User</p>
					<p className="font-medium text-slate-900">{fullName}</p>
				</div>
				<div>
					<p className="text-slate-500">Email</p>
					<p className="font-medium text-slate-900">{user?.email ?? "(guest)"}</p>
				</div>
				<div>
					<p className="text-slate-500">Cart ID</p>
					<p className="font-mono text-xs text-slate-600">{cart.id}</p>
				</div>
				<div>
					<p className="text-slate-500">Last Activity</p>
					<p className="font-medium text-slate-900">
						{cart.updated_at || cart.created_at
							? new Date(cart.updated_at || cart.created_at!).toLocaleString("vi-VN")
							: "—"}
					</p>
				</div>
			</div>

			<div>
				<p className="text-sm font-bold text-slate-900 mb-3">
					Items ({cart.itemCount})
				</p>
				<div className="divide-y divide-slate-200">
					{cart.cart_items.map((item) => (
						<CartItemRow key={item.id} item={item} depth={0} />
					))}
				</div>
			</div>

			<div className="flex items-center justify-between pt-3 border-t border-slate-200">
				<p className="text-sm text-slate-500">Total</p>
				<p className="text-lg font-bold text-slate-900">
					{formatVND(cart.cartTotal)}
				</p>
			</div>
		</div>
	);
}

function CartItemRow({ item, depth }: { item: CartItemDisplay; depth: number }) {
	const indent = depth > 0;
	const subtotal = item.unit_price * item.quantity;

	return (
		<div className={`py-3 ${indent ? "ml-6" : ""}`}>
			<div className="flex items-center justify-between">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						{indent && (
							<span className="text-xs text-slate-400 font-mono">└</span>
						)}
						<p className="text-sm font-medium text-slate-900 truncate">
							{item.product_name ?? "Unknown"}
						</p>
					</div>
					{item.variant_name && (
						<p className={`text-xs text-slate-500 ${indent ? "ml-4" : ""}`}>
							{item.variant_name}
						</p>
					)}
				</div>
				<div className="flex items-center gap-4 text-sm shrink-0">
					<span className="text-slate-500">
						{formatVND(item.unit_price)}
					</span>
					<span className="text-slate-400">x{item.quantity}</span>
					<span className="font-medium text-slate-900 w-24 text-right">
						{formatVND(subtotal)}
					</span>
				</div>
			</div>
			{item.children.map((child) => (
				<CartItemRow key={child.id} item={child} depth={depth + 1} />
			))}
		</div>
	);
}
