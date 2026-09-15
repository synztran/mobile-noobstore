"use client";

import { useNewsletterSubscribe, useReleaseSubscribe } from "@/lib/react-query/newsletter/api/useNewsletterMutations";
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
    <section className="relative overflow-hidden bg-on-surface px-6 py-8 text-surface lg:rounded-3xl lg:py-12">
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-secondary/10 blur-2xl" />

      <div className="relative z-10 lg:flex lg:items-center lg:gap-12">
        <div className="lg:flex-1">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-outline">
            Nhận thông báo sớm nhất
          </p>
          <p className="mb-3 text-3xl font-black uppercase leading-tight tracking-tight lg:text-4xl">
            HÃY LÀ
            <br />
            NGƯỜI ĐẦU TIÊN
            <br />
            BIẾT VỀ ƯU ĐÃI
          </p>
          <p className="mb-8 max-w-xs text-xs leading-relaxed text-outline lg:mb-0 lg:text-sm">
            Đăng ký để nhận thông báo về sản phẩm mới, restock, groupbuy và ưu đãi
            độc quyền trước mọi người.
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:flex-1 lg:max-w-md">
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface outline-none transition-all duration-200 placeholder:text-outline focus:border-primary-fixed-dim focus:bg-white/10 focus:ring-2 focus:ring-primary-fixed-dim/30"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full rounded-xl bg-primary py-4 text-xs font-black uppercase tracking-widest text-on-primary transition-all duration-200 hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            {isPending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "ĐĂNG KÝ NGAY"
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
