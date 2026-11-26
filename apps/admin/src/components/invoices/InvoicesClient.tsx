"use client";

import InvoiceLayoutEditor from "@/components/invoices/InvoiceLayoutEditor";
import Pagination from "@/components/ui/Pagination";
import TableCard from "@/components/ui/TableCard";
import { formatVND } from "@/lib/currency";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText, X } from "lucide-react";
import { useRef, useState } from "react";

interface InvoiceRow {
	id: string;
	order_number: string;
	created_at: string | null;
	total_price: number;
	status: string;
	invoice_url: string;
}

export default function InvoicesClient() {
	const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);
	const [page, setPage] = useState(1);
	const modalRef = useRef<HTMLDialogElement>(null);
	const { data, isLoading, isError } = useQuery({
		queryKey: ["invoices", page],
		queryFn: async () => {
			const response = await fetch(`/api/invoices?page=${page}`, { cache: "no-store" });
			if (!response.ok) throw new Error("Không tải được danh sách hóa đơn.");
			return response.json() as Promise<{ invoices: InvoiceRow[]; page: number; pageSize: number; total: number }>;
		},
	});
	const invoices = data?.invoices ?? [];
	const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)));
	function openInvoice(invoice: InvoiceRow) {
		setSelectedInvoice(invoice);
		modalRef.current?.showModal();
	}
	function closeInvoice() {
		modalRef.current?.close();
		setSelectedInvoice(null);
	}

	return (
		<div className="space-y-6">
			<header>
				<h1 className="text-2xl font-bold text-slate-900">Hóa đơn</h1>
				<p className="mt-1 text-sm text-slate-600">Danh sách PDF hóa đơn đã tạo và bố cục mẫu.</p>
			</header>
			<InvoiceLayoutEditor />
			<section className="space-y-3" aria-labelledby="invoice-list-title">
				<div className="flex items-center gap-2">
					<FileText size={18} className="text-slate-500" />
					<h2 id="invoice-list-title" className="text-lg font-semibold text-slate-900">Hóa đơn đã tạo</h2>
				</div>
				{isLoading ? <div className="h-40 animate-pulse rounded-xl bg-slate-100" aria-label="Đang tải hóa đơn" /> : null}
				{isError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Không tải được danh sách hóa đơn. Tải lại trang để thử lại.</p> : null}
				{!isLoading && !isError && invoices.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">Chưa có hóa đơn nào được tạo.</p> : null}
				{invoices.length > 0 && <TableCard>
					<table className="table table-sm w-full">
						<thead><tr><th>Đơn hàng</th><th>Ngày tạo đơn</th><th>Trạng thái</th><th className="text-right">Tổng tiền</th><th className="text-right">PDF</th></tr></thead>
						<tbody>{invoices.map((invoice) => <tr key={invoice.id}>
							<td className="font-medium">{invoice.order_number}</td>
							<td>{invoice.created_at ? new Date(invoice.created_at).toLocaleDateString("vi-VN") : "—"}</td>
							<td>{invoice.status}</td>
							<td className="text-right tabular-nums">{formatVND(invoice.total_price)}</td>
							<td className="text-right"><button type="button" className="btn btn-xs btn-ghost gap-1" onClick={() => openInvoice(invoice)}><FileText size={14} /> Xem PDF</button></td>
						</tr>)}</tbody>
					</table>
				</TableCard>}
				{!isLoading && !isError && data && <Pagination page={page} totalPages={totalPages} totalItems={data.total} itemLabel="hóa đơn" onPageChange={setPage} />}
			</section>
			<dialog ref={modalRef} className="modal modal-bottom sm:modal-middle" onClose={() => setSelectedInvoice(null)}>
				<div className="modal-box !flex !h-[94dvh] !w-[calc(100vw-1rem)] !max-w-6xl flex-col overflow-hidden p-0 sm:!w-[calc(100vw-2rem)]">
					<div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
						<div className="min-w-0">
							<h2 className="truncate text-base font-semibold text-slate-900">Hóa đơn {selectedInvoice?.order_number}</h2>
							<p className="text-sm text-slate-600">{selectedInvoice ? formatVND(selectedInvoice.total_price) : ""}</p>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							{selectedInvoice && <a className="btn btn-sm btn-outline gap-2" href={selectedInvoice.invoice_url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> <span className="hidden sm:inline">Mở tab mới</span></a>}
							<button type="button" className="btn btn-square btn-ghost btn-sm" aria-label="Đóng xem hóa đơn" onClick={closeInvoice}><X size={18} /></button>
						</div>
					</div>
					{selectedInvoice && <iframe key={selectedInvoice.id} title={`PDF hóa đơn ${selectedInvoice.order_number}`} src={selectedInvoice.invoice_url} className="!min-h-0 !w-full !flex-1 bg-slate-100" />}
				</div>
				<form method="dialog" className="modal-backdrop"><button aria-label="Đóng modal" onClick={closeInvoice}>Đóng</button></form>
			</dialog>
		</div>
	);
}
