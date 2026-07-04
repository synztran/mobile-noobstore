export function NewsletterCTA() {
  return (
    <section className="relative overflow-hidden bg-on-surface px-6 py-8 text-surface">
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-secondary/10 blur-2xl" />

      <div className="relative z-10">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-outline">
          Nhận thông báo sớm nhất
        </p>
        <p className="mb-3 text-3xl font-black uppercase leading-tight tracking-tight">
          HÃY LÀ
          <br />
          NGƯỜI ĐẦU TIÊN
          <br />
          BIẾT VỀ ƯU ĐÃI
        </p>
        <p className="mb-8 max-w-xs text-xs leading-relaxed text-outline">
          Đăng ký để nhận thông báo về sản phẩm mới, restock và ưu đãi độc quyền
          trước mọi người.
        </p>
        <div className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="email@example.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-surface outline-none transition-all duration-200 placeholder:text-outline focus:border-primary-fixed-dim focus:bg-white/10 focus:ring-2 focus:ring-primary-fixed-dim/30"
          />
          <button
            type="button"
            className="w-full rounded-xl bg-primary py-4 text-xs font-black uppercase tracking-widest text-on-primary transition-all duration-200 hover:brightness-110 active:scale-95"
          >
            ĐĂNG KÝ NGAY
          </button>
        </div>
      </div>
    </section>
  );
}
