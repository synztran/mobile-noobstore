"use client";

import { Star } from "lucide-react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

const TESTIMONIALS = [
  {
    name: "Đại Quốc",
    rating: 5,
    text: "Máy đẹp tốt đúng mô tả",
    product: "Lenovo IdeaPad",
    date: "04/07/2026",
  },
  {
    name: "tran truc",
    rating: 5,
    text: "Bàn phím QK65V2 ở đây giá tốt, nhìn rất ưng mắt với có màn hình nhỏ dễ thương. Dịch vụ tốt, chuyên nghiệp, có hỗ trợ khách nhiệt tình...",
    product: "QK65 v2",
    date: "01/11/2025",
  },
  {
    name: "Minh Nhật Huỳnh",
    rating: 5,
    text: "Người bán rất thân thiện và nhiệt tình ạ.",
    product: "",
    date: "12/10/2025",
  },
  {
    name: "Lê Anh Nhật",
    rating: 5,
    text: "Bác chủ shop rất nhiệt tình dễ thương, hàng chuẩn chỉnh ko có vấn đề gì, recommend mọi người thử trải nghiệm",
    product: "GMK Pacific",
    date: "09/09/2025",
  },
  {
    name: "lander Yuu",
    rating: 5,
    text: "kit xịn, giao hàng chu đáo",
    product: "SW Maestro",
    date: "18/08/2025",
  },
  {
    name: "Jolie Tran",
    rating: 5,
    text: "Shop siêu chu đáo luôn ý. Sẽ mua típ ạ",
    product: "Razer Iphone Case",
    date: "10/07/2025",
  },
  {
    name: "tram hoang",
    rating: 5,
    text: "Mình mua mấy cái ốp ở shop rồi. Ốp dày mà đẹp lắm. Sẽ quay lại ủng hộ shop nhiều hơn. 😍",
    product: "Razer Iphone Case",
    date: "11/06/2025",
  },
  {
    name: "Daniel Borin",
    rating: 5,
    text: "Perfect board arrived very quickly and as described :)",
    product: "",
    date: "09/05/2025",
  },
  {
    name: "Phúc Nguyễn",
    rating: 5,
    text: "chủ shop có tâm nhất quả đất",
    product: "",
    date: "16/07/2024",
  },
];

export function HomeTestimonials() {
  return (
    <section className="overflow-hidden px-6">
      <style>{`
        @keyframes testimonial-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div className="mb-5 flex items-center gap-2">
        <GoogleIcon className="h-5 w-5" />
        <p className="text-xl font-black tracking-tight text-on-surface">
          Đánh giá từ khách hàng
        </p>
      </div>
      <div className="relative">
        <div
          className="flex w-max gap-4"
          style={{
            animation: "testimonial-scroll 40s linear infinite",
          }}
        >
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <div
              key={i}
              className="flex w-[300px] flex-shrink-0 flex-col rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-5"
            >
              <div className="flex items-center gap-2">
                <GoogleIcon className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                  Google Reviews
                </span>
              </div>
              <div className="mt-2 flex gap-0.5">
                {Array.from({ length: 5 }, (_, si) => (
                  <Star
                    key={si}
                    size={13}
                    className={
                      si < t.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-outline-variant"
                    }
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-on-surface">
                {t.text}
              </p>
              <div className="mt-auto flex items-center gap-3 border-t border-outline-variant/15 pt-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-fixed text-[11px] font-black uppercase text-primary">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-on-surface">{t.name}</p>
                  <p className="text-[10px] font-semibold text-outline">
                    {t.product}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
