"use client";

import { useState } from "react";

export default function ReleaseSubscribeForm() {
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
	const [message, setMessage] = useState("");

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setStatus("loading");
		setMessage("");

		const res = await fetch("/api/release-subscribers", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});

		if (res.ok) {
			setStatus("success");
			setMessage("Đăng ký thành công! Bạn sẽ nhận được thông báo về tin mới.");
			setEmail("");
		} else {
			const data = await res.json().catch(() => null);
			setStatus("error");
			setMessage(data?.error ?? "Đăng ký thất bại. Vui lòng thử lại.");
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-3">
			<p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
				Đăng ký nhận tin
			</p>
			<p className="text-sm font-medium text-on-surface-variant">
				Nhận thông báo khi có sản phẩm mới hoặc groupbuy từ các hãng.
			</p>
			<div className="flex gap-2">
				<input
					type="email"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="your@email.com"
					disabled={status === "loading"}
					className="min-w-0 flex-1 rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-2.5 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
				/>
				<button
					type="submit"
					disabled={status === "loading"}
					className="btn btn-primary btn-sm shrink-0 rounded-xl px-5 disabled:opacity-50"
				>
					{status === "loading" ? (
						<span className="loading loading-spinner loading-xs" />
					) : (
						"Đăng ký"
					)}
				</button>
			</div>
			{message && (
				<p
					className={`text-xs font-medium ${
						status === "success" ? "text-success" : "text-error"
					}`}
				>
					{message}
				</p>
			)}
		</form>
	);
}
