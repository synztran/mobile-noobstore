"use client";

import { RefreshCw } from "lucide-react";

export default function CheckoutError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
			<p className="text-4xl font-black text-on-surface">Rất tiếc!</p>
			<p className="max-w-sm text-sm font-medium text-on-surface-variant">
				Không thể tải trang thanh toán. Vui lòng thử lại sau.
			</p>
			<button
				onClick={reset}
				className="btn btn-primary btn-sm flex items-center gap-2"
			>
				<RefreshCw size={16} />
				Thử lại
			</button>
		</div>
	);
}
