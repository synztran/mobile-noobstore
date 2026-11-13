"use client";

import { useShippingEstimate } from "@/lib/react-query/shipping/api/useShippingQueries";
import { motion } from "framer-motion";
import { Truck } from "lucide-react";

export function ShippingInfoSection() {
  const { data, isLoading } = useShippingEstimate();
  const estimates = data?.estimates ?? [];

  return (
    <section className="rounded-2xl bg-surface p-4 shadow-ambient-sm">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-on-surface">
        Vận chuyển & đổi trả
      </h2>

      <div className="space-y-3 text-xs text-on-surface-variant">
        {isLoading ? (
          <div
            className="animate-pulse space-y-3"
            aria-label="Đang tải thông tin vận chuyển"
          >
            {[1, 2].map((item) => (
              <div key={item} className="flex gap-3">
                <div className="h-8 w-8 rounded-lg bg-surface-container-high" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-28 rounded bg-surface-container-high" />
                  <div className="h-3 w-40 rounded bg-surface-container" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          estimates.map((method, index) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: index * 0.06,
                duration: 0.25,
                ease: "easeOut",
              }}
              className="flex gap-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Truck size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-on-surface">{method.name}</p>
                {method.description && (
                  <p className="mt-0.5">{method.description}</p>
                )}
                <p className="mt-0.5 text-primary">
                  Nhận hàng{" "}
                  {new Date(method.estimated_date_min).toLocaleDateString(
                    "vi-VN"
                  )}
                  {" — "}
                  {new Date(method.estimated_date_max).toLocaleDateString(
                    "vi-VN"
                  )}
                </p>
              </div>
            </motion.div>
          ))
        )}

        {!isLoading && estimates.length === 0 && (
          <p>Thời gian giao hàng sẽ được cập nhật theo địa chỉ nhận hàng.</p>
        )}

        <p className="border-t border-outline-variant/20 pt-3 font-semibold text-on-surface">
          Cam kết sản phẩm chính hãng 100%
        </p>
      </div>
    </section>
  );
}
