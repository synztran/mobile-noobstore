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
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
			<div className="w-full max-w-md">
				<div className="bg-white rounded-lg shadow-xl p-8">
					<h1 className="text-3xl font-bold text-center mb-8 text-slate-900">
						NoobStore Admin
					</h1>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="label">
								<span className="label-text font-medium">
									Email
								</span>
							</label>
							<input
								type="email"
								placeholder="admin@example.com"
								className="input input-bordered w-full"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								disabled={loading}
							/>
						</div>

						<div>
							<label className="label">
								<span className="label-text font-medium">
									Password
								</span>
							</label>
							<input
								type="password"
								placeholder="••••••••"
								className="input input-bordered w-full"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={loading}
							/>
						</div>

						{error && (
							<div className="alert alert-error">
								<svg
									className="stroke-current shrink-0 h-6 w-6"
									fill="none"
									viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m2 2l2 2m0 0l2 2m-2-2l2 2"
									/>
								</svg>
								<span>{error}</span>
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
