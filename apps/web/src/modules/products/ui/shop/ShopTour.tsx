"use client";

import { CircleHelp } from "lucide-react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useCallback, useEffect, useRef, useState } from "react";

const TOUR_STORAGE_KEY = "noobstore-shop-tour-seen";

const STEPS: DriveStep[] = [
  {
    element: '[data-tour="search"]',
    popover: {
      title: "Tìm kiếm sản phẩm",
      description:
        "Nhập tên sản phẩm — bàn phím, switch, keycap, phụ kiện — để lọc kết quả ngay khi gõ.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="results"]',
    popover: {
      title: "Kết quả bộ sưu tập",
      description:
        "Số sản phẩm đang hiển thị. Kết hợp tìm kiếm, bộ lọc và sắp xếp để thu hẹp nhanh.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="filter"]',
    popover: {
      title: "Bộ lọc",
      description:
        "Lọc theo danh mục, thương hiệu và khoảng giá. Có thể kết hợp nhiều tiêu chí cùng lúc.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="sort"]',
    popover: {
      title: "Sắp xếp",
      description:
        "Sắp theo mới nhất, bán chạy, giá tăng hoặc giảm dần cho phù hợp nhu cầu.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: '[data-tour="grid"]',
    popover: {
      title: "Lưới sản phẩm",
      description:
        "Chạm vào sản phẩm để xem chi tiết, chọn tùy chọn và thêm vào giỏ hàng.",
      side: "top",
      align: "start",
    },
    waitForElement: 3000,
  },
  {
    element: '[data-tour="recent"]',
    popover: {
      title: "Đã xem gần đây",
      description:
        "Sản phẩm bạn từng ghé thăm sẽ được gợi ý lại ở đây. Lướt ngang để mở lại nhanh.",
      side: "bottom",
      align: "start",
    },
  },
];

export function ShopTour() {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const [active, setActive] = useState(false);

  const getDriver = useCallback(() => {
    if (!driverRef.current) {
      driverRef.current = driver({
        animate: true,
        overlayColor: "#1b1c1a",
        overlayOpacity: 0.55,
        showProgress: true,
        progressText: "Bước {{current}} / {{total}}",
        nextBtnText: "Tiếp",
        prevBtnText: "Quay lại",
        doneBtnText: "Hoàn tất",
        skipMissingElement: true,
        popoverClass: "noobstore-guide",
        onDestroyed: () => setActive(false),
        steps: STEPS,
      });
    }
    return driverRef.current;
  }, []);

  const start = useCallback(() => {
    const tour = getDriver();
    setActive(true);
    tour.drive();
  }, [getDriver]);

  // Auto-launch once per browser on first shop visit.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(TOUR_STORAGE_KEY)) return;
      localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      if (document.querySelector('[data-tour="search"]')) start();
    }, 800);
    return () => clearTimeout(timer);
  }, [start]);

  return (
    <button
      type="button"
      onClick={() =>
        driverRef.current?.isActive() ? driverRef.current.destroy() : start()
      }
      aria-label={active ? "Đóng hướng dẫn" : "Hướng dẫn sử dụng"}
      className="flex items-center gap-1 rounded-full bg-surface-container px-3 py-2.5 text-xs font-bold text-on-surface transition-colors active:opacity-70"
    >
      <CircleHelp className="h-4 w-4" />
      Hướng dẫn
    </button>
  );
}
