"use client";

import Icon from "@/components/ui/Icon";
import { ListOrdered, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

interface TopNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function TopNavDrawer({ open, onClose }: TopNavDrawerProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKey);
      setTimeout(() => menuRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="z-60 fixed inset-0 bg-black/40" onClick={onClose} />

      <aside
        id="topnav-menu"
        ref={menuRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="fixed left-0 top-0 z-[51] h-full w-72 bg-base-100 px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] text-on-surface shadow-lg sm:w-80"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Danh mục</h2>
          <button
            aria-label="Close menu"
            onClick={onClose}
            className="text-on-surface hover:opacity-70"
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="mt-4">
          <ul className="flex flex-col gap-3">
            <li>
              <Link
                href="/"
                onClick={onClose}
                className="flex items-center gap-3 rounded p-2 hover:bg-gray-100"
              >
                <Icon name="home" className="text-[18px]" />
                Trang chủ
              </Link>
            </li>
            <li>
              <Link
                href="/shop"
                onClick={onClose}
                className="flex items-center gap-3 rounded p-2 hover:bg-gray-100"
              >
                <Icon name="shopping_bag" className="text-[18px]" />
                Cửa hàng
              </Link>
            </li>
            <li>
              <Link
                href="/profile"
                onClick={onClose}
                className="flex items-center gap-3 rounded p-2 hover:bg-gray-100"
              >
                <Icon name="person" className="text-[18px]" />
                Tài khoản người dùng
              </Link>
            </li>
            <li>
              <Link
                href="/wishlist"
                onClick={onClose}
                className="flex items-center gap-3 rounded p-2 hover:bg-gray-100"
              >
                <Icon name="favorite" className="text-[18px]" />
                Sản phẩm yêu thích
              </Link>
            </li>
            <li>
              <Link
                href="/profile/orders"
                onClick={onClose}
                className="flex items-center gap-3 rounded p-2 hover:bg-gray-100"
              >
                <ReceiptText />
                Đơn hàng
              </Link>
            </li>
            <li>
              <Link
                href="/profile/notifications"
                onClick={onClose}
                className="flex items-center gap-3 rounded p-2 hover:bg-gray-100"
              >
                <Icon name="notifications" className="text-[18px]" />
                Thông báo
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
}
