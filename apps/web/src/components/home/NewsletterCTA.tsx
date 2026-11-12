"use client";

import {
  useNewsletterSubscribe,
  useReleaseSubscribe,
} from "@/lib/react-query/newsletter/api/useNewsletterMutations";
import { toast } from "@/lib/toast";
import { trackNewsletterSubscribe } from "@/lib/analytics";
import { useState } from "react";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const newsletterMutation = useNewsletterSubscribe();
  const releaseMutation = useReleaseSubscribe();

  const isPending = newsletterMutation.isPending || releaseMutation.isPending;

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Vui lòng nhập email");
      return;
    }

    try {
      await Promise.all([
        newsletterMutation.mutateAsync(trimmed),
        releaseMutation.mutateAsync(trimmed),
      ]);

      toast.success("Đăng ký thành công! Bạn sẽ nhận được thông báo sớm nhất.");
      trackNewsletterSubscribe();
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Đăng ký thất bại");
    }
  };

  return (
    <div className="relative mb-2 mt-10 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-fixed/60 via-surface-container-low to-surface-container-low p-5 sm:p-6 lg:mb-4 lg:mt-12 lg:flex lg:items-center lg:gap-10">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative z-10 lg:flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
          Nhận thông báo sớm nhất
        </p>
        <p className="mt-2 max-w-[30ch] text-xl font-black uppercase leading-tight tracking-tight text-on-surface sm:text-2xl">
          Ưu đãi mới, đến tay bạn trước.
        </p>
        <p className="mt-2 max-w-[52ch] text-xs leading-relaxed text-on-surface-variant">
          Sản phẩm mới, restock, group buy và ưu đãi độc quyền — gửi thẳng vào
          hộp thư của bạn.
        </p>
      </div>

      <div className="relative z-10 mt-4 flex flex-col gap-2 sm:flex-row lg:mt-0 lg:w-[min(420px,46%)]">
        <label htmlFor="newsletter-email" className="sr-only">
          Email nhận thông báo
        </label>
        <input
          id="newsletter-email"
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full min-w-0 rounded-xl border border-outline-variant/60 bg-surface px-4 py-3 text-sm text-on-surface outline-none transition-all duration-200 placeholder:text-on-surface-variant/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="shrink-0 rounded-xl bg-primary px-6 py-3 text-xs font-black uppercase tracking-widest text-on-primary transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-60"
        >
          {isPending ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            "ĐĂNG KÝ NGAY"
          )}
        </button>
      </div>
    </div>
  );
}
