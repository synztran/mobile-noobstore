"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

interface PaginationProps {
	page: number;
	totalPages: number;
	totalItems?: number;
	itemLabel?: string;
	onPageChange?: (page: number) => void;
	basePath?: string;
	query?: Record<string, string>;
}

function buildHref(basePath: string, query: Record<string, string> | undefined, page: number) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query ?? {})) if (value) params.set(key, value);
	params.set("page", String(page));
	return `${basePath}?${params.toString()}`;
}

export default function Pagination({ page, totalPages, totalItems, itemLabel = "mục", onPageChange, basePath, query }: PaginationProps) {
	if (totalPages <= 1) return null;
	const previousDisabled = page <= 1;
	const nextDisabled = page >= totalPages;
	const className = "btn btn-sm btn-outline gap-2";

	return (
		<nav className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3" aria-label="Phân trang">
			<p className="text-sm text-slate-600" aria-live="polite">Trang {page} / {totalPages}{totalItems !== undefined ? ` · ${totalItems} ${itemLabel}` : ""}</p>
			<div className="flex gap-2">
				{onPageChange ? <button type="button" className={className} disabled={previousDisabled} onClick={() => onPageChange(Math.max(1, page - 1))}><ArrowLeft size={16} /> Trước</button> : <Link className={`${className}${previousDisabled ? " pointer-events-none opacity-50" : ""}`} href={buildHref(basePath ?? "", query, page - 1)} aria-disabled={previousDisabled}><ArrowLeft size={16} /> Trước</Link>}
				{onPageChange ? <button type="button" className={className} disabled={nextDisabled} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>Sau <ArrowRight size={16} /></button> : <Link className={`${className}${nextDisabled ? " pointer-events-none opacity-50" : ""}`} href={buildHref(basePath ?? "", query, page + 1)} aria-disabled={nextDisabled}>Sau <ArrowRight size={16} /></Link>}
			</div>
		</nav>
	);
}
