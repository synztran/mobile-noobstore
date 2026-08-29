"use client";

import Icon from "@/components/ui/Icon";
import { CaptchaWidget, isCaptchaEnabled, type CaptchaWidgetHandle } from "@/components/ui/CaptchaWidget";
import { RefreshCcwDot } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";
import { useRef, useState } from "react";

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	const captchaRef = useRef<CaptchaWidgetHandle>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) {
			toast.error("Vui lòng nhập địa chỉ email");
			return;
		}
		if (isCaptchaEnabled && !captchaToken) {
			toast.error("Vui lòng hoàn thành xác thực captcha");
			return;
		}
		setLoading(true);

		const supabase = createClient();
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/update-password`,
			...(captchaToken ? { captchaToken } : {}),
		});
		captchaRef.current?.reset();

		if (error) {
			toast.error(error.message);
			setLoading(false);
			return;
		}

		setSent(true);
		setLoading(false);
	};

	if (sent) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center px-8 pb-12 pt-20">
				<div className="flex flex-col items-center">
					<RefreshCcwDot className="mb-4 h-16 w-16 animate-spin-reverse text-primary" />
					<p className="mb-2 text-xl font-black tracking-tight text-on-surface">
						Đã gửi email!
					</p>
					<p className="mb-8 max-w-xs text-center text-sm font-medium text-on-surface-variant">
						Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến{" "}
						<strong className="text-on-surface">{email}</strong>.
						Kiểm tra hộp thư và làm theo hướng dẫn.
					</p>
					<Link
						href="/login"
						className="text-sm font-bold text-primary underline underline-offset-4"
					>
						Quay lại đăng nhập
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col px-8 pb-12 pt-20">
			<div className="mb-12 flex flex-col items-center">
				<div className="relative mb-2 flex h-32 w-48 items-center gap-2">
					<Image
						src="/logo/noob-store.png"
alt="NoobStore Logo"
					objectFit="contain"
					fill
					sizes="192px"
					className="rounded-xl"
					/>
				</div>
			</div>

			<p className="mb-2 text-3xl font-black tracking-tight text-on-surface">
				Quên mật khẩu?
			</p>
			<p className="mb-8 text-sm font-medium text-on-surface-variant">
				Nhập email của bạn, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.
			</p>

			<form onSubmit={handleSubmit} className="w-full space-y-4">
				<div className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4">
					<Icon name="mail" className="text-xl text-outline" />
					<input
						type="email"
						placeholder="Địa chỉ Email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="flex-1 bg-transparent font-medium text-on-surface outline-none placeholder:text-outline"
						autoComplete="email"
						disabled={loading}
					/>
				</div>

			{/* hCaptcha */}
			<div className="flex justify-center">
				<CaptchaWidget
					ref={captchaRef}
					onTokenChange={setCaptchaToken}
				/>
			</div>

			<button
				type="submit"
				disabled={loading}
				className="primary-gradient btn mt-2 h-auto w-full rounded-2xl border-0 py-4 text-base font-bold normal-case text-white shadow-ambient-sm transition-transform active:scale-[0.98] disabled:opacity-60"
			>
					{loading ? (
						<span className="loading loading-spinner loading-sm" />
					) : (
						"Gửi hướng dẫn"
					)}
				</button>
			</form>

			<p className="mt-8 text-center text-sm text-on-surface">
				Nhớ mật khẩu?{" "}
				<Link
					href="/login"
					className="font-black text-on-surface underline underline-offset-4"
				>
					Đăng nhập
				</Link>
			</p>
		</div>
	);
}
