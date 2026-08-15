"use client";

export function PreOrderBanner() {
  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-violet-700">
          Sản phẩm Pre-order
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-violet-600">
          Đơn hàng có sản phẩm pre-order. Thời gian giao hàng dự kiến dựa vào
          thời gian hàng về đến shop. Do vấn đề hải quan, nên thời gian có thể
          delay thêm
        </p>
      </div>
    </div>
  );
}
