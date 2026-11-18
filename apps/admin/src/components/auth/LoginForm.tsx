"use client";

import { createClient } from "@/lib/supabase/client";
import { CaptchaWidget, isCaptchaEnabled, type CaptchaWidgetHandle } from "@/components/ui/CaptchaWidget";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

export default function LoginForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	const captchaRef = useRef<CaptchaWidgetHandle>(null);
	const router = useRouter();

	async function handleSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		setError(null);

		if (isCaptchaEnabled && !captchaToken) {
			setError("Please complete the CAPTCHA verification");
			setLoading(false);
			return;
		}

		try {
			const supabase = createClient();

			const { data, error: authError } =
				await supabase.auth.signInWithPassword({
					email,
					password,
					...(captchaToken ? { options: { captchaToken } } : {}),
				});
			captchaRef.current?.reset();

			if (authError) {
				setError(authError.message);
				return;
			}

			if (data.user) {
				// Verify user is admin
				const { data: profile, error: profileError } = await supabase
					.from("users")
					.select("role")
					.eq("id", data.user.id)
					.single();

				if (profileError || profile?.role !== "admin") {
					setError("You don't have admin access");
					await supabase.auth.signOut();
					return;
				}

				router.push("/dashboard");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-[rgb(var(--admin-bg))] px-4">
			<div className="w-full max-w-sm">
				<div className="card-panel p-7">
					<div className="mb-7 flex flex-col items-center">
						<span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
							N
						</span>
						<h1 className="text-lg font-semibold tracking-tight text-heading">
							NoobStore Admin
						</h1>
						<p className="mt-1 text-[13px] text-muted">
							Sign in to continue
						</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="mb-1.5 block text-[13px] font-medium text-body">
								Email
							</label>
							<input
								type="email"
								placeholder="admin@example.com"
								className="input-minimal w-full"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								disabled={loading}
							/>
						</div>

						<div>
							<label className="mb-1.5 block text-[13px] font-medium text-body">
								Password
							</label>
							<input
								type="password"
								placeholder="••••••••"
								className="input-minimal w-full"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={loading}
							/>
						</div>

						{error && (
							<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-700">
								{error}
							</div>
						)}

						<div className="flex justify-center">
							<CaptchaWidget
								ref={captchaRef}
								onTokenChange={setCaptchaToken}
							/>
						</div>

						<button
							type="submit"
							className="btn btn-primary w-full"
							disabled={loading}>
							{loading ? "Logging in..." : "Login"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
