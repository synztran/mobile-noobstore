"use client";

import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { CaptchaWidget, isCaptchaEnabled, type CaptchaWidgetHandle } from "@/components/ui/CaptchaWidget";
import { useAuth } from "@/modules/user/client/AuthProvider";
import { safeRedirect } from "@/modules/user/redirect";
import { toast } from "@/lib/toast";
import Image from "@/components/ui/AdaptiveImage";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaWidgetHandle>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    if (isCaptchaEnabled && !captchaToken) {
      toast.error("Vui lòng hoàn thành xác thực captcha");
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password, captchaToken ?? undefined);
    captchaRef.current?.reset();
    if (error) {
      toast.error(error);
      setLoading(false);
      return;
    }
    toast.success("Chào mừng trở lại!");
    const next = safeRedirect(searchParams.get("next"));
    router.push(next);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error);
      setLoading(false);
      return;
    }
  };

  return (
    <div className="flex flex-1 flex-col px-8 pb-12 pt-20">
      {/* Logo */}
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
        <h1 className="font-sans text-2xl font-black tracking-tighter text-on-surface">
          NoobStore
        </h1>
      </div>

      {/* Heading */}
      <h2 className="mb-8 text-center text-4xl font-black tracking-tight text-on-surface">
        Chào mừng trở lại
      </h2>

      {/* Form */}
      <form onSubmit={handleSignIn} className="w-full space-y-4">
        {/* Email */}
        <div className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4">
          <Mail className="h-5 w-5 text-outline" />
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

        {/* Password */}
        <div className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4">
          <Lock className="h-5 w-5 text-outline" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 bg-transparent font-medium text-on-surface outline-none placeholder:text-outline"
            autoComplete="current-password"
            disabled={loading}
          />
          <button
            type="button"
            aria-label="Hiện/ẩn mật khẩu"
            onClick={() => setShowPassword(!showPassword)}
            className="text-outline transition-colors hover:text-on-surface"
          >
            {showPassword ? (
              <Eye className="h-5 w-5" />
            ) : (
              <EyeOff className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Forgot password */}
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-semibold text-on-surface underline underline-offset-4"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {/* hCaptcha */}
        <div className="flex justify-center">
          <CaptchaWidget
            ref={captchaRef}
            onTokenChange={setCaptchaToken}
          />
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          data-testid="login-submit"
          disabled={loading}
          className="primary-gradient btn mt-2 h-auto w-full rounded-2xl border-0 py-4 text-base font-bold normal-case text-white shadow-ambient-sm transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            "Đăng nhập"
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-outline-variant" />
        <span className="text-sm font-medium text-on-surface-variant">
          Hoặc tiếp tục với
        </span>
        <div className="h-px flex-1 bg-outline-variant" />
      </div>

      <button
        type="button"
        data-testid="google-login"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest py-3.5 font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60"
      >
        {loading ? (
          <span className="loading loading-spinner loading-sm" />
        ) : (
          <>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </>
        )}
      </button>

      {/* Sign up link */}
      <p className="mt-8 text-center text-sm text-on-surface">
        Bạn chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="font-black text-on-surface underline underline-offset-4"
        >
          Đăng ký
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
