"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SaleCountdown } from "@/modules/products/ui/product/SaleCountdown";

const MESSAGES = [
  { text: "Ưu đãi đặc biệt cho đơn hàng đầu tiên", href: "/shop" },
  {
    text: "Liên hệ hỗ trợ để được tư vấn miễn phí",
    href: "",
  },
  { text: "ĐẶT HÀNG - TÍCH ĐIỂM - ĐỔI QUÀ", href: "/rewards" },
];

const ROTATE_INTERVAL = 3500;

export interface FlashSalePromo {
  text: string;
  href: string;
  endsAt: string;
}

export function AnnouncementBanner({
  flashSale,
}: {
  flashSale?: FlashSalePromo | null;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  const messages = flashSale
    ? [{ text: flashSale.text, href: flashSale.href }, ...MESSAGES]
    : MESSAGES;

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActiveIdx((i) => (i + 1) % messages.length);
        setVisible(true);
      }, 300);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [messages.length]);

  const msg = messages[activeIdx];

  return (
    <div className="relative flex w-full items-center justify-center overflow-hidden bg-on-surface px-4 py-2.5 text-surface">
      <Link
        href={msg.href}
        className={`text-center text-[11px] font-semibold uppercase tracking-wide transition-all duration-300 ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-1 opacity-0"
        }`}
      >
        {msg.text}
        {flashSale && activeIdx === 0 && (
          <span className="ml-2 inline-block align-middle">
            <SaleCountdown endsAt={flashSale.endsAt} />
          </span>
        )}
      </Link>

      {/* Dot indicators */}
      <div className="absolute right-4 flex items-center gap-1">
        {messages.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to announcement ${i + 1}`}
            onClick={() => setActiveIdx(i)}
            className={`rounded-full transition-all duration-300 ${
              i === activeIdx
                ? "h-1 w-3 bg-primary-fixed-dim"
                : "h-1 w-1 bg-white/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
