import VoucherComponent from "@/components/voucher/VoucherComponent";
import type { VoucherRow } from "@/types/voucher";
import { headers } from "next/headers";

async function getInitialVouchers(): Promise<VoucherRow[]> {
	try {
		const h = await headers();
		const host = h.get("x-forwarded-host") ?? h.get("host");
		if (!host) {
			return [];
		}

		const protocol = h.get("x-forwarded-proto") ?? "http";
		const baseUrl = `${protocol}://${host}`;
		const res = await fetch(`${baseUrl}/api/vouchers`, {
			cache: "no-store",
		});

		if (!res.ok) {
			return [];
		}

		const data = (await res.json()) as { vouchers?: VoucherRow[] };
		return data.vouchers ?? [];
	} catch {
		return [];
	}
}

export async function VoucherPage() {
	const vouchers = await getInitialVouchers();

	return (
		<div className="space-y-4">
			<header className="space-y-1">
				<p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
					Uu dai
				</p>
				<h1 className="text-2xl font-black text-on-surface tracking-tight">
					Voucher va giam gia
				</h1>
			</header>
			<VoucherComponent initialVouchers={vouchers} />
		</div>
	);
}

export default VoucherPage;
