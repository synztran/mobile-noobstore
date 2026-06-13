"use client";

import { usePreventScroll } from "@/hooks/usePreventScroll";
import { useDiscountStore } from "@/store";
import type { VoucherRow } from "@/types/voucher";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { VoucherCard } from "./VoucherCard";

interface VoucherDrawerProps {
  drawerOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  validVouchers: VoucherRow[];
  invalidVouchers: VoucherRow[];
  filteredVouchers: VoucherRow[];
  subtotal: number;
}

export function VoucherDrawer({
  drawerOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  validVouchers,
  invalidVouchers,
  filteredVouchers,
  subtotal,
}: VoucherDrawerProps) {
  const { appliedVoucher, applyingVoucher, applyVoucher } = useDiscountStore();

  usePreventScroll(drawerOpen);

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] !mt-0 bg-on-surface/30 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`duration-250 fixed left-0 right-0 z-[999] flex h-full max-h-[80dvh] flex-col rounded-t-5xl bg-surface transition-all ease-out ${
          drawerOpen ? "top-[20vh]" : "top-[110vh]"
        }`}
      >
        {/* Handle */}
        <div className="flex justify-center pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-outline-variant" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <h2 className="text-xl font-black tracking-tight text-on-surface">
            Chọn mã giảm giá
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface transition-opacity hover:opacity-70 active:scale-95"
          ></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          <div className="menu flex h-full w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-base-200 p-0">
            {/* Search Header */}
            <div className="border-b border-outline-variant/30 px-4 pb-3 pt-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  placeholder="Tìm kiếm mã giảm giá..."
                  className="input input-bordered w-full pl-9 pr-3 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Voucher List */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {/* Valid Vouchers Section */}
              {validVouchers.length > 0 && (
                <>
                  <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">
                    Voucher khả dụng ({validVouchers.length})
                  </p>
                  {validVouchers.map((voucher) => (
                    <motion.div
                      key={voucher.id}
                      layout
                      initial={{
                        opacity: 0,
                        y: -8,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        duration: 0.22,
                      }}
                    >
                      <VoucherCard
                        voucher={voucher}
                        isApplied={appliedVoucher?.voucher_id === voucher.id}
                        isApplying={applyingVoucher}
                        isValid={true}
                        subtotal={subtotal}
                        onApply={() => {
                          void applyVoucher(voucher.id, subtotal);
                        }}
                      />
                    </motion.div>
                  ))}
                </>
              )}

              {/* Invalid Vouchers Section */}
              {invalidVouchers.length > 0 && (
                <>
                  <p className="mt-4 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-warning">
                    Voucher không khả dụng ({invalidVouchers.length})
                  </p>
                  {invalidVouchers.map((voucher) => (
                    <motion.div
                      key={voucher.id}
                      layout
                      initial={{
                        opacity: 0,
                        y: -8,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        duration: 0.22,
                      }}
                    >
                      <VoucherCard
                        voucher={voucher}
                        isApplied={false}
                        isApplying={false}
                        isValid={false}
                        subtotal={subtotal}
                      />
                    </motion.div>
                  ))}
                </>
              )}

              {/* No Results */}
              {filteredVouchers.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-on-surface-variant">
                    Không tìm thấy voucher
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
