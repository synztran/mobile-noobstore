import { BadgeCheck, ChevronRight } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function IdentityVerified() {
  return (
    <div className="font-body-md flex min-h-[max(884px,100dvh)] flex-col bg-background text-on-background antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Main Content Canvas */}
      <main className="px-margin-mobile pb-xl relative flex flex-1 flex-col items-center justify-center overflow-hidden pt-[80px]">
        {/* Subtle Ambient Background Element */}
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-40">
          <div className="h-[300px] w-[300px] rounded-full bg-secondary-container blur-[80px]"></div>
        </div>

        {/* Success Container */}
        <div className="mt-xl relative z-10 flex w-full max-w-md flex-col items-center space-y-2">
          {/* Floating Hero Card */}
          <div className="animate-fade-up flex w-full transform flex-col items-center space-y-4 rounded-xl p-[32px] text-center transition-transform">
            {/* Success Icon */}
            <div className="mb-lg relative mb-2">
              <div className="absolute inset-0 scale-150 rounded-full bg-secondary-container opacity-50 blur-md"></div>
              <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-4 border-surface-container-lowest bg-secondary-container">
                <span className="material-symbols-outlined text-[48px] text-secondary">
                  <BadgeCheck className="text-green-600" size={48} />
                </span>
              </div>
            </div>

            {/* Typography */}
            <span className="font-headline-lg-mobile text-headline-lg-mobile mb-sm text-2xl text-primary">
              Xác thực thành công
            </span>
            <p className="font-body-lg text-body-lg mb-xl mx-auto text-on-surface-variant">
              Cảm ơn bạn đã xác nhận email. Tài khoản của bạn hiện đã được bảo
              mật hoàn toàn và bạn có quyền truy cập đầy đủ vào tất cả các tính
              năng.
            </p>

            {/* Call to Action */}
            <Link
              href="/login"
              className="font-label-md text-label-md primary-gradient group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-4 py-3 text-on-secondary shadow-sm shadow-secondary-container/50 transition-colors duration-300 hover:bg-on-secondary-container active:scale-[0.98]"
            >
              <span>Quay lại trang đăng nhập</span>
              <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-x-1">
                <ChevronRight className="text-on-secondary" />
              </span>
            </Link>

            {/* Secondary Context */}
            <div className="mt-md font-label-sm text-label-sm flex items-center gap-2 text-on-tertiary-container">
              <span className="material-symbols-outlined text-[16px]">
                lock
              </span>
              <span>End-to-end encrypted session</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
