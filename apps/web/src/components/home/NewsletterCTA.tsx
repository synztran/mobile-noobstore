export function NewsletterCTA() {
	return (
		<section className="bg-on-surface text-surface py-16 px-8 relative overflow-hidden">
			<div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
			<div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />

			<div className="relative z-10">
				<p className="text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-3">
					Nhận thông báo sớm nhất
				</p>
				<h2 className="text-3xl font-black uppercase tracking-tight leading-tight mb-3">
					HÃY LÀ
					<br />
					NGƯỜI ĐẦU TIÊN
					<br />
					BIẾT VỀ ƯU ĐÃI
				</h2>
				<p className="text-xs text-outline leading-relaxed mb-8 max-w-xs">
					Đăng ký để nhận thông báo về sản phẩm mới, restock và ưu đãi
					độc quyền trước mọi người.
				</p>
				<div className="flex flex-col gap-3">
					<input
						type="email"
						placeholder="email@example.com"
						className="w-full bg-white/5 border border-white/10 text-surface placeholder:text-outline text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-primary-fixed-dim"
					/>
					<button
						type="button"
						className="w-full bg-primary text-on-primary font-black text-xs tracking-widest uppercase py-4 rounded-xl active:scale-95 transition-transform">
						ĐĂNG KÝ NGAY
					</button>
				</div>
			</div>
		</section>
	);
}
