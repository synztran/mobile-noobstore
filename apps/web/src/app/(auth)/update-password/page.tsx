"use client";

import Icon from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function UpdatePasswordPage() {
	const router = useRouter();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [checking, setChecking] = useState(true);
	const [valid, setValid] = useState(false);

	useEffect(() => {
		const checkSession = async () => {
			const supabase = createClient();
			const { data } = await supabase.auth.getSession();
			if (!data.session) {
				toast.error("Link không hợp lệ hoặc đã hết hạn");
				router.replace("/forgot-password");
				return;
			}
			setValid(true);
			setChecking(false);
		};
		checkSession();
	}, [router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!password || !confirmPassword) {
			toast.error("Vui lòng điền đầy đủ thông tin");
			return;
		}
		if (password.length < 6) {
			toast.error("Mật khẩu phải có ít nhất 6 ký tự");
			return;
		}
		if (password !== confirmPassword) {
			toast.error("Mật khẩu không khớp");
			return;
		}
		setLoading(true);

		const supabase = createClient();
		const { error } = await supabase.auth.updateUser({ password });

		if (error) {
			toast.error(error.message);
			setLoading(false);
			return;
		}

		toast.success("Đặt lại mật khẩu thành công!");
		router.push("/login");
	};

	if (checking) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<span className="loading loading-spinner loading-lg text-primary" />
			</div>
		);
	}

	if (!valid) return null;

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
				Đặt lại mật khẩu
			</p>
			<p className="mb-8 text-sm font-medium text-on-surface-variant">
				Nhập mật khẩu mới cho tài khoản của bạn.
			</p>

			<form onSubmit={handleSubmit} className="w-full space-y-4">
				<div className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4">
					<Icon name="lock" className="text-xl text-outline" />
					<input
						type={showPassword ? "text" : "password"}
						placeholder="Mật khẩu mới"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="flex-1 bg-transparent font-medium text-on-surface outline-none placeholder:text-outline"
						autoComplete="new-password"
						disabled={loading}
					/>
				</div>

				<div className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4">
					<Icon name="lock" className="text-xl text-outline" />
					<input
						type={showPassword ? "text" : "password"}
						placeholder="Xác nhận mật khẩu mới"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						className="flex-1 bg-transparent font-medium text-on-surface outline-none placeholder:text-outline"
						autoComplete="new-password"
						disabled={loading}
					/>
					<button
						type="button"
						aria-label="Hiện/ẩn mật khẩu"
						onClick={() => setShowPassword(!showPassword)}
						className="text-outline transition-colors hover:text-on-surface"
					>
						<Icon
							name={showPassword ? "visibility" : "visibility_off"}
							className="text-xl"
						/>
					</button>
				</div>

				<button
					type="submit"
					disabled={loading}
					className="primary-gradient btn mt-2 h-auto w-full rounded-2xl border-0 py-4 text-base font-bold normal-case text-white shadow-ambient-sm transition-transform active:scale-[0.98] disabled:opacity-60"
				>
					{loading ? (
						<span className="loading loading-spinner loading-sm" />
					) : (
						"Đặt lại mật khẩu"
					)}
				</button>
			</form>

			<p className="mt-8 text-center text-sm text-on-surface">
				<Link
					href="/login"
					className="font-black text-on-surface underline underline-offset-4"
				>
					Quay lại đăng nhập
				</Link>
			</p>
		</div>
	);
}
