"use client";

import { CheckCircle2, Lock } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const REDIRECT_SECONDS = 5;

export default function IdentityVerified() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const redirectedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 && !redirectedRef.current) {
      redirectedRef.current = true;
      router.push("/");
    }
  }, [secondsLeft, router]);

  const progress = (secondsLeft / REDIRECT_SECONDS) * 100;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 pb-12 pt-10">
      {/* Logo */}
      {/* <div className="mb-8 flex flex-col items-center">
        <div className="relative mb-2 flex h-16 w-24 items-center gap-2">
          <Image
            src="/logo/noob-store.png"
            alt="NoobStore Logo"
            objectFit="contain"
            fill
            sizes="96px"
            className="rounded-xl"
          />
        </div>
      </div> */}

      {/* Success Container */}
      <div className="flex w-full max-w-md flex-col items-center space-y-4 text-center">
        {/* Success mark */}
        <div className="relative mb-2">
          <div
            className="absolute inset-0 scale-150 rounded-full bg-secondary-container opacity-60 blur-md"
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-24 w-24 animate-fade-in items-center justify-center rounded-full border-4 border-surface-container-lowest bg-secondary-container">
            <CheckCircle2 className="h-12 w-12 text-on-secondary-container" />
          </div>
        </div>

        {/* Typography */}
        <h1 className="text-2xl font-black tracking-tight text-on-surface">
          Xác thực thành công
        </h1>
        <p className="text-base leading-relaxed text-on-surface-variant">
          Cảm ơn bạn đã xác nhận email. Tài khoản của bạn hiện đã được bảo mật
          hoàn toàn và bạn có quyền truy cập đầy đủ vào tất cả các tính năng.
        </p>

        {/* Countdown */}
        <div className="w-full max-w-xs space-y-2 pt-2" role="status">
          <p className="text-sm font-medium text-on-surface-variant">
            Tự động chuyển hướng về trang chủ trong{" "}
            <span className="font-black text-primary" aria-hidden="true">
              {secondsLeft}s
            </span>
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Call to Action */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="primary-gradient btn mt-2 h-auto w-full max-w-xs rounded-2xl border-0 py-4 text-base font-bold normal-case text-white shadow-ambient-sm transition-transform active:scale-[0.98]"
        >
          Về trang chủ ngay
        </button>

        {/* Trust */}
        <div className="flex items-center gap-1.5 pt-2 text-xs font-medium text-on-surface-variant">
          <Lock className="h-3.5 w-3.5" />
          <span>Phiên được mã hóa đầu cuối</span>
        </div>
      </div>
    </div>
  );
}
