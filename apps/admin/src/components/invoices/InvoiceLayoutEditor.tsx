"use client";

import { INVOICE_SECTIONS, type InvoiceSectionId } from "@/lib/invoices/layout";
import { ArrowDown, ArrowUp, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";

export default function InvoiceLayoutEditor() {
	const [sections, setSections] = useState<InvoiceSectionId[]>([]);
	const [savedSections, setSavedSections] = useState<InvoiceSectionId[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [message, setMessage] = useState("");

	useEffect(() => {
		let active = true;
		fetch("/api/invoices/layout", { cache: "no-store" })
			.then(async (response) => {
				if (!response.ok) throw new Error("Không tải được bố cục hóa đơn.");
				return response.json() as Promise<{ sections: InvoiceSectionId[] }>;
			})
			.then((data) => {
				if (active) {
					setSections(data.sections);
					setSavedSections(data.sections);
				}
			})
			.catch((error: unknown) => active && setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra."))
			.finally(() => active && setLoading(false));
		return () => { active = false; };
	}, []);

	function move(index: number, delta: -1 | 1) {
		setSections((current) => {
			const target = index + delta;
			if (target < 0 || target >= current.length) return current;
			const next = [...current];
			[next[index], next[target]] = [next[target], next[index]];
			return next;
		});
		setMessage("");
	}

	async function save() {
		setSaving(true);
		setMessage("");
		try {
			const response = await fetch("/api/invoices/layout", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sections }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error ?? "Không lưu được bố cục.");
			setSections(data.sections);
			setSavedSections(data.sections);
			setMessage("Đã lưu bố cục. Hóa đơn cũ chỉ đổi sau khi tạo lại PDF.");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra khi lưu.");
		} finally {
			setSaving(false);
		}
	}

	const labels = new Map(INVOICE_SECTIONS.map(({ id, label }) => [id, label]));
	const dirty = sections.some((section, index) => section !== savedSections[index]);

	return (
		<section className="space-y-4 rounded-xl border border-[rgb(var(--admin-border))] bg-white p-4 md:p-5" aria-labelledby="invoice-layout-title">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 id="invoice-layout-title" className="text-lg font-semibold text-slate-900">Bố cục PDF hóa đơn</h2>
					<p className="mt-1 text-sm text-slate-600">Sắp xếp các khối bằng nút lên/xuống. Thay đổi áp dụng cho PDF tạo mới hoặc tạo lại.</p>
				</div>
				<button type="button" className="btn btn-sm btn-primary gap-2" disabled={loading || saving || !dirty} onClick={() => void save()}>
					{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
					Lưu bố cục
				</button>
			</div>
			{loading ? <p className="text-sm text-slate-500" role="status">Đang tải bố cục…</p> : (
				<div className="grid gap-5 lg:grid-cols-[minmax(260px,0.65fr)_minmax(0,1.35fr)]">
					<div className="space-y-3">
					<ol className="divide-y divide-slate-200 rounded-lg border border-slate-200" aria-label="Thứ tự các khối hóa đơn">
						{sections.map((section, index) => (
							<li key={section} className="flex min-h-14 items-center justify-between gap-3 px-3 py-2">
								<span className="text-sm font-medium text-slate-800">{index + 1}. {labels.get(section)}</span>
								<div className="flex gap-1">
									<button type="button" className="btn btn-xs btn-ghost" aria-label={`Đưa ${labels.get(section)} lên`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
									<button type="button" className="btn btn-xs btn-ghost" aria-label={`Đưa ${labels.get(section)} xuống`} disabled={index === sections.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
								</div>
							</li>
						))}
					</ol>
					<button type="button" className="btn btn-sm btn-outline" disabled={!dirty || saving} onClick={() => { setSections(savedSections); setMessage(""); }}>Hoàn tác về cấu hình đã lưu</button>
					</div>
					<div className="min-h-[540px] overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-3 sm:p-5" aria-label="Xem trước bố cục hóa đơn">
						<article className="mx-auto min-h-[700px] w-full max-w-[760px] space-y-4 bg-white p-5 text-slate-800 shadow-md sm:p-8" aria-label="Hóa đơn mẫu NoobStore">
							{sections.map((section) => <InvoicePreviewSection key={section} section={section} />)}
						</article>
					</div>
				</div>
			)}
			{message && <p className="text-sm text-slate-600" role="status">{message}</p>}
		</section>
	);
}

function InvoicePreviewSection({ section }: { section: InvoiceSectionId }) {
	switch (section) {
		case "company":
			return <header className="grid grid-cols-2 gap-4 border-b-2 border-slate-800 pb-3">
				<div><p className="text-lg font-bold">NoobStore</p><p className="mt-1 text-[10px] leading-4 text-slate-600">70 Đường 47, phường Hiệp Bình, Thành phố Thủ Đức<br />Hồ Chí Minh, Việt Nam 700000</p></div>
				<div className="text-right"><p className="text-2xl font-bold">Hóa Đơn</p><div className="my-2 ml-auto h-7 w-28 bg-[repeating-linear-gradient(90deg,#111_0_2px,transparent_2px_4px,#111_4px_5px,transparent_5px_8px)]" aria-label="Mã vạch minh họa"/><div className="space-y-1 text-[10px]"><PreviewTotal label="Đơn hàng:" value="#NS-DEMO-2026"/><PreviewTotal label="Ngày lập:" value="25 tháng 11, 2026"/><PreviewTotal label="Lập bởi:" value="NoobStore"/><PreviewTotal label="Ngày hết hạn:" value="26 tháng 12, 2026"/><PreviewTotal label="Discount:" value="Voucher"/><div className="mt-2 bg-slate-100 p-1 font-bold"><PreviewTotal label="Cần thanh toán:" value="1.000.000 ₫" bold/></div></div></div>
			</header>;
		case "customer":
			return <section className="text-xs"><h3 className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Gửi đến</h3><p className="font-semibold">Nguyễn Minh Anh</p><p className="mt-0.5 text-slate-600">123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh</p><p className="mt-1 text-[10px] text-slate-500">Đơn hàng #NS-DEMO-2026</p></section>;
		case "items":
			return <section><table className="w-full border-collapse text-left text-[10px]"><thead><tr className="bg-slate-800 text-white"><th className="p-2">Sản phẩm/Dịch vụ</th><th className="p-2 text-center">SL</th><th className="p-2 text-right">Đơn giá</th><th className="p-2 text-right">Tổng tiền</th></tr></thead><tbody>
				<tr className="border-b border-slate-200 align-top"><td className="p-2"><p className="font-semibold">Bàn phím cơ NoobStore Sample 75%</p><p className="mt-1 text-slate-500">Switch: Gateron Milky Yellow Pro</p><p className="text-slate-500">Keycap: PBT Cherry Profile</p><p className="text-slate-500">Bảo hành 12 tháng</p></td><td className="p-2 text-center">1</td><td className="p-2 text-right whitespace-nowrap">2.200.000 ₫</td><td className="p-2 text-right whitespace-nowrap">2.200.000 ₫</td></tr>
				<tr className="border-b border-slate-200"><td className="p-2">Dịch vụ lube switch</td><td className="p-2 text-center">1</td><td className="p-2 text-right whitespace-nowrap">300.000 ₫</td><td className="p-2 text-right whitespace-nowrap">300.000 ₫</td></tr>
			</tbody></table></section>;
		case "totals":
			return <section className="ml-auto max-w-[250px] space-y-1.5 border-t border-slate-300 pt-3 text-xs"><PreviewTotal label="Tạm tính:" value="2.500.000 ₫" /><PreviewTotal label="Vận chuyển:" value="30.000 ₫" /><PreviewTotal label="Giảm giá (Voucher):" value="−150.000 ₫" /><PreviewTotal label="Thuế (0%):" value="0 ₫" /><PreviewTotal label="Tổng tiền:" value="2.380.000 ₫" bold /><PreviewTotal label="Đã thanh toán (58%):" value="1.380.000 ₫" bold /><PreviewTotal label="Còn lại (COD):" value="1.000.000 ₫" bold /></section>;
		case "signature":
			return <section className="ml-auto w-48 pt-3 text-center text-[10px]"><p className="font-semibold">Chữ ký xác nhận khách hàng</p><p className="mt-1 text-slate-500">(Ký, ghi rõ họ tên)</p><div className="mt-12 border-b border-slate-400" /></section>;
		case "notes":
			return <section className="border-t border-slate-200 pt-3 text-[10px] leading-4"><p className="font-semibold">Ghi chú:</p><p className="text-slate-600">Bằng việc ký xác nhận bên cạnh. Quý khách xác nhận đã kiểm tra và đồng ý với tình trạng ngoại quan cũng như chức năng của (các) sản phẩm trong đơn hàng.</p><p className="mt-2 font-semibold">Điều khoản:</p><p className="text-slate-600">Đơn hàng không hỗ trợ hoàn tiền sau 3 ngày.</p></section>;
	}
}

function PreviewTotal({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
	return <div className={`flex justify-between gap-3 ${bold ? "font-bold text-slate-900" : "text-slate-600"}`}><span>{label}</span><span className="whitespace-nowrap">{value}</span></div>;
}
