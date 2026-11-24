"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { formatVND } from "@/lib/currency";
import { useAuctionCheckoutMutation } from "../client/queries";
import type { AuctionDetailResponse } from "../types";

export function AuctionCheckoutClient({
  detail,
  savedAddresses = [],
}: {
  detail: AuctionDetailResponse;
  savedAddresses?: Array<{
    id: string;
    full_name: string;
    phone_number: string;
    address: string;
    city: string;
    district: string;
    ward: string;
  }>;
}) {
  const router = useRouter();
  const auction = detail.auction;
  const product = auction.product;

  const defaultAddr = savedAddresses[0];

  const [fullName, setFullName] = useState(defaultAddr?.full_name || "");
  const [phoneNumber, setPhoneNumber] = useState(defaultAddr?.phone_number || "");
  const [address, setAddress] = useState(defaultAddr?.address || "");
  const [city, setCity] = useState(defaultAddr?.city || "Hồ Chí Minh");
  const [district, setDistrict] = useState(defaultAddr?.district || "");
  const [ward, setWard] = useState(defaultAddr?.ward || "");
  const [paymentType, setPaymentType] = useState<"bank_transfer" | "cod">("bank_transfer");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkoutMutation = useAuctionCheckoutMutation(auction.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName || !phoneNumber || !address || !district || !ward) {
      setErrorMsg("Vui lòng điền đầy đủ thông tin giao hàng");
      return;
    }

    try {
      const res = await checkoutMutation.mutateAsync({
        deliveryAddress: {
          fullName,
          phoneNumber,
          address,
          city,
          district,
          ward,
        },
        paymentType,
        shippingFee: 0, // Free shipping for auction winners
      });

      if (res.success) {
        router.push("/profile/orders");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể hoàn tất thanh toán");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <Link
        href={`/auctions/${auction.id}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Quay lại chi tiết phiên đấu giá</span>
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
          Thanh toán phiên đấu giá
        </h1>
        <p className="text-xs text-muted-foreground">
          Hoàn tất thông tin giao nhận để nhân viên NoobStore tiến hành đóng gói và giao sản phẩm độc bản tới bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Form Column (2 cols) */}
        <form onSubmit={handleSubmit} className="md:col-span-2 space-y-5">
          {/* Shipping Address Card */}
          <div className="rounded-2xl bg-surface border border-border p-5 space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Truck size={17} className="text-primary" />
              Địa chỉ nhận hàng
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Họ và tên người nhận
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-border focus:border-primary focus:outline-none text-sm text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Số điện thoại liên hệ
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0912345678"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-border focus:border-primary focus:outline-none text-sm text-foreground"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Tỉnh / Thành phố
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-border focus:border-primary focus:outline-none text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Quận / Huyện
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Quận 1"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-border focus:border-primary focus:outline-none text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Phường / Xã
                  </label>
                  <input
                    type="text"
                    required
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder="Bến Nghé"
                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-border focus:border-primary focus:outline-none text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Địa chỉ chi tiết (Số nhà, tên đường)
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số 123 Đường Lê Lợi"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-container border border-border focus:border-primary focus:outline-none text-sm text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Card */}
          <div className="rounded-2xl bg-surface border border-border p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CreditCard size={17} className="text-primary" />
              Phương thức thanh toán
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType("bank_transfer")}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  paymentType === "bank_transfer"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 bg-surface-container text-muted-foreground"
                }`}
              >
                <span className="text-xs font-bold text-foreground">Chuyển khoản QR</span>
                <span className="text-[11px] text-muted-foreground mt-1">VietQR tức thì 24/7</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType("cod")}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  paymentType === "cod"
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 bg-surface-container text-muted-foreground"
                }`}
              >
                <span className="text-xs font-bold text-foreground">COD (Nhận hàng)</span>
                <span className="text-[11px] text-muted-foreground mt-1">Thanh toán khi nhận</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={checkoutMutation.isPending}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-content font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {checkoutMutation.isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Đang xử lý đơn hàng...</span>
              </>
            ) : (
              <>
                <PackageCheck size={18} />
                <span>Xác nhận đặt hàng {formatVND(auction.current_price)}</span>
              </>
            )}
          </button>
        </form>

        {/* Order Summary Column (1 col) */}
        <div className="rounded-2xl bg-surface border border-border p-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Sản phẩm trúng đấu giá</h3>

          <div className="flex items-center gap-3 pb-3 border-b border-border/40">
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 border border-border/40">
              <Image
                src={product?.thumbnail || "/images/placeholder.png"}
                alt={product?.name ?? "Sản phẩm"}
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-foreground line-clamp-2">
                {product?.name ?? "Sản phẩm đấu giá"}
              </h4>
              <span className="text-[11px] text-muted-foreground">Số lượng: 1</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Giá thắng cuộc:</span>
              <span className="font-mono font-bold text-foreground">
                {formatVND(auction.current_price)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Phí vận chuyển:</span>
              <span className="text-emerald-500 font-semibold">Miễn phí</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border/40 text-sm font-bold text-foreground">
              <span>Tổng thanh toán:</span>
              <span className="font-mono text-primary text-base">
                {formatVND(auction.current_price)}
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck size={15} className="text-emerald-500 flex-shrink-0" />
            <span>Đảm bảo hàng chính hãng 100% từ NoobStore</span>
          </div>
        </div>
      </div>
    </div>
  );
}
