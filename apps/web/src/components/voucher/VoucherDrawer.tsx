"use client";

import { usePreventScroll } from "@/hooks/usePreventScroll";
import { useApplyVouchers } from "@/lib/react-query/voucher/api/useVoucherMutations";
import { useDiscountStore } from "@/store";
import type { VoucherApplyItem, VoucherRow } from "@/types/voucher";
import { Search, Ticket, X } from "lucide-react";
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
  shippingCost?: number;
  shippingMethodId?: string;
  items?: VoucherApplyItem[];
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
  shippingCost = 0,
  shippingMethodId,
  items,
}: VoucherDrawerProps) {
  const appliedVouchers = useDiscountStore((s) => s.appliedVouchers);
  const applyVouchersMutation = useApplyVouchers();

  usePreventScroll(drawerOpen);

  const appliedIds = new Set(
    appliedVouchers.map((v) => v.voucherInfo.voucher_id)
  );

  const handleApply = (voucherId: string) => {
    const currentIds = appliedVouchers.map((v) => v.voucherInfo.voucher_id);
    if (!currentIds.includes(voucherId)) {
      currentIds.push(voucherId);
    }
    applyVouchersMutation.mutate({
      voucherIds: currentIds,
      subtotal,
      shippingCost,
      shippingMethodId,
      items,
    });
  };

  return (
    <>
      {/* Inert backdrop - dims screen and blocks page interaction, strictly non-dismissible */}
      <div
        className={`fixed inset-0 z-[60] !mt-0 bg-on-surface/40 backdrop-blur-xs transition-opacity duration-300 ${
          drawerOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* Modal Dialog (Bottom Sheet on Mobile, Centered Modal on Desktop) */}
      <div
        className={`fixed z-[70] flex flex-col overflow-hidden bg-surface shadow-2xl transition-all duration-300 ease-out ${
          /* Mobile: Bottom Sheet */
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl"
        } ${
          /* Desktop: Centered Dialog */
          "md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[82vh] md:w-full md:max-w-xl md:rounded-3xl"
        } ${
          drawerOpen
            ? "pointer-events-auto translate-y-0 opacity-100 md:-translate-x-1/2 md:-translate-y-1/2"
            : "pointer-events-none translate-y-full opacity-0 md:-translate-x-1/2 md:translate-y-[-40%]"
        }`}
      >
        {/* Mobile Drag Handle */}
        <div className="flex justify-center pb-1 pt-2.5 md:hidden">
          <div className="h-1 w-10 rounded-full bg-outline-variant/40" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/15 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <Ticket size={18} className="stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-black text-on-surface">
                Mã giảm giá & Khuyến mãi
              </h3>
              <p className="text-[11px] text-on-surface-variant">
                Chọn voucher áp dụng cho đơn hàng
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl border border-outline-variant/30 bg-surface-container text-on-surface-variant transition-colors hover:border-primary hover:text-primary active:scale-90"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="border-b border-outline-variant/10 bg-surface-container-low/50 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Nhập mã voucher hoặc tìm kiếm..."
              className="input input-sm w-full rounded-xl border-outline-variant/30 bg-surface pl-10 pr-4 text-xs font-medium placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Voucher Scrollable Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* Valid Vouchers */}
          {validVouchers.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant">
                Voucher khả dụng ({validVouchers.length})
              </p>
              <div className="space-y-3">
                {validVouchers.map((voucher) => (
                  <VoucherCard
                    key={voucher.id}
                    voucher={voucher}
                    isApplied={appliedIds.has(voucher.id)}
                    isApplying={applyVouchersMutation.isPending}
                    isValid={true}
                    subtotal={subtotal}
                    onApply={() => handleApply(voucher.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Invalid Vouchers */}
          {invalidVouchers.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant/70">
                Chưa đủ điều kiện ({invalidVouchers.length})
              </p>
              <div className="space-y-3">
                {invalidVouchers.map((voucher) => (
                  <VoucherCard
                    key={voucher.id}
                    voucher={voucher}
                    isApplied={false}
                    isApplying={false}
                    isValid={false}
                    subtotal={subtotal}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredVouchers.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-surface-container text-on-surface-variant/60">
                <Ticket size={24} />
              </div>
              <p className="text-sm font-bold text-on-surface">
                Không tìm thấy voucher phù hợp
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Vui lòng kiểm tra lại mã hoặc điều kiện đơn hàng
              </p>
            </div>
          )}
        </div>

        {/* Footer Close CTA */}
        <div className="border-t border-outline-variant/15 bg-surface p-4">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary h-11 min-h-[44px] w-full rounded-2xl text-xs font-black uppercase tracking-wider text-surface shadow-xs transition-all active:scale-[0.99]"
          >
            Đóng
          </button>
        </div>
      </div>
    </>
  );
}
