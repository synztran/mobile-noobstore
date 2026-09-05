"use client";

import Icon from "@/components/ui/Icon";
import {
  CaptchaWidget,
  type CaptchaWidgetHandle,
} from "@/components/ui/CaptchaWidget";
import { useAuth } from "@/modules/user/client/AuthProvider";
import { useRegisterForm } from "@/modules/user/client/useRegisterForm";
import { toast } from "@/lib/toast";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MailWarning } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<CaptchaWidgetHandle>(null);

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
  } = useRegisterForm(captchaToken ?? undefined, () =>
    captchaRef.current?.reset()
  );

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading || user) return null;

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error);
      setGoogleLoading(false);
      return;
    }
  };

  return (
    <div className="flex flex-1 flex-col px-8 pb-12 pt-16">
      {/* Heading */}
      <h2 className="mb-2 text-4xl font-black tracking-tight text-on-surface">
        Tạo tài khoản
      </h2>
      <p className="mb-8 text-sm text-on-surface-variant">
        Tham gia NoobStore để có quyền truy cập độc quyền.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {/* Full Name */}
        <div>
          <div
            className={`flex items-center gap-3 rounded-2xl border bg-surface-container-lowest px-5 py-4 ${touched.fullName && errors.fullName ? "border-error" : "border-outline-variant"}`}
          >
            <Icon name="person" className="text-xl text-outline" />
            <input
              type="text"
              name="fullName"
              placeholder="Họ và tên"
              value={values.fullName}
              onChange={handleChange}
              onBlur={handleBlur}
              className="flex-1 bg-transparent font-medium text-on-surface outline-none placeholder:text-outline"
              autoComplete="name"
              disabled={isSubmitting}
            />
          </div>
          {touched.fullName && errors.fullName && (
            <p className="ml-1 mt-1 text-xs font-semibold text-error">
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <div
            className={`flex items-center gap-3 rounded-2xl border bg-surface-container-lowest px-5 py-4 ${touched.email && errors.email ? "border-error" : "border-outline-variant"}`}
          >
            <Icon name="mail" className="text-xl text-outline" />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className="flex-1 bg-transparent font-medium text-on-surface outline-none placeholder:text-outline"
              autoComplete="email"
              disabled={isSubmitting}
            />
          </div>
          {touched.email && errors.email && (
            <p className="ml-1 mt-1 text-xs font-semibold text-error">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div
            className={`flex items-center gap-3 rounded-2xl border bg-surface-container-lowest px-5 py-4 ${touched.password && errors.password ? "border-error" : "border-outline-variant"}`}
          >
            <Icon name="lock" className="text-xl text-outline" />
            <input
              type="password"
              name="password"
              placeholder="Mật khẩu"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              className="flex-1 bg-transparent font-medium text-on-surface outline-none placeholder:text-outline"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </div>
          {/* Password condition */}
          {(values.password.length > 0 || touched.password) && (
            <div
              className={`ml-1 mt-1.5 flex items-center gap-1.5 text-xs font-medium transition-colors ${values.password.length >= 8 ? "text-success" : "text-error"}`}
            >
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
          <div className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4">
            <Icon name="lock" className="shrink-0 text-xl text-outline" />
            <div className="relative flex-1">
              {/* Per-character background behind password dots */}
              {values.confirmPassword ? (
                <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden rounded-lg">
                  {values.confirmPassword.split("").map((char, i) => {
                    const match =
                      i < values.password.length && char === values.password[i];
                    return (
                      <div
                        key={i}
                        className={`h-full transition-colors ${
                          match ? "bg-success/15" : "bg-error/15"
                        }`}
                        style={{
                          width: `${100 / values.confirmPassword.length}%`,
                        }}
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
                className="relative w-full bg-transparent font-medium text-on-surface outline-none placeholder:text-outline"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </div>
            {values.confirmPassword.length > 0 &&
            values.password === values.confirmPassword ? (
              <Icon
                name="check_circle"
                className="shrink-0 text-xl text-success"
              />
            ) : null}
          </div>
          {touched.confirmPassword && errors.confirmPassword && (
            <p className="ml-1 mt-1 text-xs font-semibold text-error">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Terms checkbox */}
        <div>
          <label className="mt-2 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="agreed"
              checked={values.agreed}
              onChange={(e) => setFieldValue("agreed", e.target.checked)}
              className="checkbox checkbox-sm mt-0.5 rounded border-outline-variant checked:border-primary checked:bg-primary"
              disabled={isSubmitting}
            />
            <span className="text-sm leading-relaxed text-on-surface">
              Tôi đồng ý với{" "}
              <Link href="/terms" className="underline underline-offset-2">
                Điều khoản &amp; Điều kiện
              </Link>{" "}
              và{" "}
              <Link href="/policy" className="underline underline-offset-2">
                Chính sách bảo mật
              </Link>
            </span>
          </label>
          {touched.agreed && errors.agreed && (
            <p className="ml-1 mt-1 text-xs font-semibold text-error">
              {errors.agreed}
            </p>
          )}
        </div>

        {/* hCaptcha */}
        <div className="flex justify-center">
          <CaptchaWidget ref={captchaRef} onTokenChange={setCaptchaToken} />
        </div>

        {/* Register Button */}
        <button
          type="submit"
          data-testid="register-submit"
          disabled={isSubmitting}
          className="primary-gradient btn mt-2 h-auto w-full rounded-2xl border-0 py-4 text-base font-bold normal-case text-white shadow-ambient-sm transition-transform active:scale-[0.98] disabled:opacity-60"
        >
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
          className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-amber-600"
        >
          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="inline-block"
          >
            <MailWarning size={14} />
          </motion.span>
          Kiểm tra cả mục Spam nếu không thấy email xác nhận
        </motion.p>
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
        data-testid="google-register"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest py-3.5 font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60"
      >
        {googleLoading ? (
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

      {/* Log in link */}
      <p className="mt-8 text-center text-sm text-on-surface">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-black text-primary">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
