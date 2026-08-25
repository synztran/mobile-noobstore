"use client";

import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useCallback, useEffect, useRef } from "react";

const TOUR_STORAGE_KEY = "noobstore-services-tour-v1";

function buildSteps() {
  return [
    {
      element: "#tour-hero",
      popover: {
        title: "Chào mừng đến Dịch vụ NoobStore! 👋",
        description:
          "Đặt lịch chăm sóc bàn phím của bạn chỉ trong vài chạm. Xem nhanh các bước nhé!",
        side: "bottom" as const,
        align: "start" as const,
      },
    },
    {
      element: "#tour-quick-nav",
      popover: {
        title: "Chọn nhanh dịch vụ",
        description: "Nhấn vào một mục để nhảy thẳng tới nhóm dịch vụ bạn cần.",
        side: "bottom" as const,
        align: "start" as const,
      },
    },
    {
      element: "#tour-sections",
      popover: {
        title: "Thêm dịch vụ vào đơn",
        description:
          'Chọn "Thêm mới dịch vụ" trong từng nhóm để cấu hình — ví dụ số lượng switch, layout bàn phím, hoặc mô tả lỗi kèm ảnh.',
        side: "top" as const,
        align: "start" as const,
      },
    },
    {
      element: "#tour-appointment",
      popover: {
        title: "Hẹn lịch và ghi chú",
        description:
          "Chọn thời gian và ghi chú pickup — shipper sẽ đến tận nơi nhận bàn phím.",
        side: "top" as const,
        align: "start" as const,
      },
    },
    {
      element: "#tour-summary-bar",
      popover: {
        title: "Đặt lịch & hoàn tất 🎉",
        description:
          "Kiểm tra tạm tính rồi nhấn đặt lịch. Bạn theo dõi được trạng thái đơn ngay trong Hồ sơ.",
        side: "top" as const,
        align: "center" as const,
      },
    },
  ];
}

interface ServicesTourProps {
  onReady?: (startTour: () => void) => void;
}

export function ServicesTour({ onReady }: ServicesTourProps) {
  const driverRef = useRef<Driver | null>(null);

  const startTour = useCallback(() => {
    if (driverRef.current) return;

    driverRef.current = driver({
      showProgress: true,
      progressText: "{{current}} / {{total}}",
      nextBtnText: "Tiếp →",
      prevBtnText: "← Sau",
      doneBtnText: "Hoàn thành ✓",
      allowClose: true,
      skipMissingElement: true,
      steps: buildSteps(),
      onDestroyStarted: () => {
        try {
          localStorage.setItem(TOUR_STORAGE_KEY, new Date().toISOString());
        } catch {
          // private mode — tour just replays next visit
        }
        driverRef.current?.destroy();
        driverRef.current = null;
      },
    });

    driverRef.current.drive();
  }, []);

  useEffect(() => {
    onReady?.(startTour);
  }, [onReady, startTour]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tryStart = (attempt = 0) => {
      if (cancelled || driverRef.current) return;

      let seen = false;
      try {
        seen = localStorage.getItem(TOUR_STORAGE_KEY) !== null;
      } catch {
        seen = false;
      }
      if (seen) return;

      if (!document.getElementById("tour-sections")) {
        if (attempt < 40) {
          timer = setTimeout(() => tryStart(attempt + 1), 250);
        }
        return;
      }

      startTour();
    };

    timer = setTimeout(() => tryStart(), 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [startTour]);

  return null;
}
