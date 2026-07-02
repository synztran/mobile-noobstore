"use client";

import Icon from "@/components/ui/Icon";
import { useRegisterForm } from "@/hooks/useRegisterForm";
import { motion } from "motion/react";
import Link from "next/link";

export default function RegisterPage() {
	const {
		values,
		errors,
		touched,
		isSubmitting,
		handleChange,
		handleBlur,
		handleSubmit,
		setFieldValue,
	} = useRegisterForm();

	return (
		<div className="flex-1 flex flex-col px-8 pt-16 pb-12">
			{/* Heading */}
			<h2 className="text-4xl font-black text-on-surface mb-2 tracking-tight">
				Tạo tài khoản
			</h2>
			<p className="text-on-surface-variant text-sm mb-8">
				Tham gia NoobStore để có quyền truy cập độc quyền.
			</p>

			{/* Form */}
			<form onSubmit={handleSubmit} className="space-y-4 w-full">
				{/* Full Name */}
				<div>
					<div className={`flex items-center gap-3 bg-surface-container-lowest border rounded-2xl px-5 py-4 ${touched.fullName && errors.fullName ? "border-error" : "border-outline-variant"}`}>
						<Icon name="person" className="text-outline text-xl" />
						<input
							type="text"
							name="fullName"
							placeholder="Họ và tên"
							value={values.fullName}
							onChange={handleChange}
							onBlur={handleBlur}
							className="flex-1 bg-transparent text-on-surface placeholder:text-outline font-medium outline-none"
							autoComplete="name"
							disabled={isSubmitting}
						/>
					</div>
					{touched.fullName && errors.fullName && (
						<p className="text-error text-xs font-semibold mt-1 ml-1">{errors.fullName}</p>
					)}
				</div>

				{/* Email */}
				<div>
					<div className={`flex items-center gap-3 bg-surface-container-lowest border rounded-2xl px-5 py-4 ${touched.email && errors.email ? "border-error" : "border-outline-variant"}`}>
						<Icon name="mail" className="text-outline text-xl" />
						<input
							type="email"
							name="email"
							placeholder="Email"
							value={values.email}
							onChange={handleChange}
							onBlur={handleBlur}
							className="flex-1 bg-transparent text-on-surface placeholder:text-outline font-medium outline-none"
							autoComplete="email"
							disabled={isSubmitting}
						/>
					</div>
					{touched.email && errors.email && (
						<p className="text-error text-xs font-semibold mt-1 ml-1">{errors.email}</p>
					)}
				</div>

				{/* Password */}
				<div>
					<div className={`flex items-center gap-3 bg-surface-container-lowest border rounded-2xl px-5 py-4 ${touched.password && errors.password ? "border-error" : "border-outline-variant"}`}>
						<Icon name="lock" className="text-outline text-xl" />
						<input
							type="password"
							name="password"
							placeholder="Mật khẩu"
							value={values.password}
							onChange={handleChange}
							onBlur={handleBlur}
							className="flex-1 bg-transparent text-on-surface placeholder:text-outline font-medium outline-none"
							autoComplete="new-password"
							disabled={isSubmitting}
						/>
					</div>
					{/* Password condition */}
					{(values.password.length > 0 || touched.password) && (
						<div className={`flex items-center gap-1.5 mt-1.5 ml-1 text-xs font-medium transition-colors ${values.password.length >= 8 ? "text-success" : "text-error"}`}>
							<Icon
								name={values.password.length >= 8 ? "check_circle" : "cancel"}
								className="text-sm"
							/>
							<span>Ít nhất 8 ký tự</span>
						</div>
					)}
				</div>

				{/* Confirm Password */}
				<div>
					<div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant rounded-2xl px-5 py-4">
						<Icon name="lock" className="text-outline text-xl shrink-0" />
						<div className="relative flex-1">
							{/* Per-character background behind password dots */}
							{values.confirmPassword ? (
								<div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden rounded-lg">
									{values.confirmPassword.split("").map((char, i) => {
										const match =
											i < values.password.length &&
											char === values.password[i];
										return (
											<div
												key={i}
												className={`h-full transition-colors ${
													match ? "bg-success/15" : "bg-error/15"
												}`}
												style={{ width: `${100 / values.confirmPassword.length}%` }}
											/>
										);
									})}
								</div>
							) : null}
							<input
								type="password"
								name="confirmPassword"
								placeholder="Xác nhận mật khẩu"
								value={values.confirmPassword}
								onChange={handleChange}
								onBlur={handleBlur}
								className="relative w-full bg-transparent text-on-surface placeholder:text-outline font-medium outline-none"
								autoComplete="new-password"
								disabled={isSubmitting}
							/>
						</div>
						{values.confirmPassword.length > 0 &&
							values.password === values.confirmPassword ? (
							<Icon
								name="check_circle"
								className="text-xl text-success shrink-0"
							/>
						) : null}
					</div>
					{touched.confirmPassword && errors.confirmPassword && (
						<p className="text-error text-xs font-semibold mt-1 ml-1">{errors.confirmPassword}</p>
					)}
				</div>

				{/* Terms checkbox */}
				<div>
					<label className="flex items-start gap-3 cursor-pointer mt-2">
						<input
							type="checkbox"
							name="agreed"
							checked={values.agreed}
							onChange={(e) => setFieldValue("agreed", e.target.checked)}
							className="checkbox checkbox-sm mt-0.5 rounded border-outline-variant checked:bg-primary checked:border-primary"
							disabled={isSubmitting}
						/>
						<span className="text-sm text-on-surface leading-relaxed">
							Tôi đồng ý với{" "}
							<Link href="/terms#terms" className="underline underline-offset-2">
								Điều khoản &amp; Điều kiện
							</Link>{" "}
							và{" "}
							<Link href="/terms#policy" className="underline underline-offset-2">
								Chính sách bảo mật
							</Link>
						</span>
					</label>
					{touched.agreed && errors.agreed && (
						<p className="text-error text-xs font-semibold mt-1 ml-1">{errors.agreed}</p>
					)}
				</div>

				{/* Register Button */}
        <button
          type="submit"
          data-testid="register-submit"
          disabled={isSubmitting}
          className="btn w-full primary-gradient text-white border-0 rounded-2xl normal-case font-bold text-base py-4 h-auto mt-2 active:scale-[0.98] transition-transform shadow-ambient-sm disabled:opacity-60">
					{isSubmitting ? (
						<span className="loading loading-spinner loading-sm" />
					) : (
						"Đăng ký"
					)}
				</button>
				<motion.p
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3, duration: 0.5 }}
					className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600 text-center mt-3"
				>
					<motion.span
						animate={{ scale: [1, 1.15, 1] }}
						transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
						className="inline-block"
					>
						<Icon name="warning" className="text-sm" />
					</motion.span>
					Kiểm tra cả mục Spam nếu không thấy email xác nhận
				</motion.p>
			</form>

			{/* Log in link */}
			<p className="text-center mt-8 text-on-surface text-sm">
				Đã có tài khoản?{" "}
				<Link href="/login" className="font-black text-primary">
					Đăng nhập
				</Link>
			</p>
		</div>
	);
}
