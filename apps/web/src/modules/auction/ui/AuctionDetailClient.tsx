"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  Box,
  Camera,
  ChevronDown,
  Info,
  Loader2,
  Share2,
  ShoppingBag,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { formatVND } from "@/lib/currency";
import { toast } from "@/lib/toast";
import { useAuctionDetailQuery, useBuyNowMutation } from "../client/queries";
import { useAuctionRealtime } from "../client/useAuctionRealtime";
import { AuctionStatusBadge } from "./AuctionStatusBadge";
import { AuctionTimer } from "./AuctionTimer";
import { BidForm } from "./BidForm";
import { BidHistory } from "./BidHistory";
import type { AuctionDetailResponse } from "../types";
import { hasAuctionProductDetails } from "../product-details";
import { ProductThumbnailStrip } from "@/modules/products/ui/product/ProductThumbnailStrip";

const CONDITION_GRADES = {
  S: {
    label: "New 100% • Hoàn hảo tuyệt đối",
    description: "Hàng mới 100%, nguyên hộp, nguyên tem niêm phong nhà sản xuất hoặc seal studio. Chưa từng qua lắp ráp switch/keycap hay gõ thử. Ngoại hình và mạch nguyên vẹn hoàn hảo.",
    badge: "border-emerald-300 bg-emerald-50 text-emerald-800",
    panel: "border-emerald-300 bg-emerald-50 text-emerald-950",
  },
  A: {
    label: "Like New 98–99% • Gần như mới",
    description: "Đã mở hộp để kiểm định hoặc trưng bày trong tủ kính. Không có bất kỳ vết trầy xước nào trên anod hay tạ đồng. Đầy đủ 100% bao bì và phụ kiện đi kèm.",
    badge: "border-sky-300 bg-sky-50 text-sky-800",
    panel: "border-sky-200 bg-sky-50 text-sky-950",
  },
  B: {
    label: "Excellent 90–95% • Rất tốt",
    description: "Đã qua sử dụng lướt nhẹ nhàng. Có thể xuất hiện xước dăm cực nhỏ ở mặt đáy hoặc tạ đồng do ma sát nhẹ, nhưng không thể thấy khi bàn phím đặt trên bàn. Bo mạch hoàn hảo.",
    badge: "border-amber-300 bg-amber-50 text-amber-900",
    panel: "border-amber-200 bg-amber-50 text-amber-950",
  },
  C: {
    label: "Good 80–89% • Khá",
    description: "Đã sử dụng một thời gian. Có vết cấn nhẹ ở góc mép, hoặc tạ đồng có dấu hiệu oxy hóa tự nhiên. Mọi chức năng hotswap, LED, Type-C hoạt động chuẩn xác 100%.",
    badge: "border-orange-300 bg-orange-50 text-orange-900",
    panel: "border-orange-200 bg-orange-50 text-orange-950",
  },
  D: {
    label: "Fair < 80% • Cần tân trang",
    description: "Ngoại hình có trầy xước hoặc cấn móp rõ rệt, có thể thiếu phụ kiện phụ. Phù hợp cho người mua có kinh nghiệm muốn re-anodize, cerakote hoặc mod lại theo ý thích.",
    badge: "border-rose-300 bg-rose-50 text-rose-900",
    panel: "border-rose-200 bg-rose-50 text-rose-950",
  },
} as const;

type ConditionGrade = keyof typeof CONDITION_GRADES;

function isConditionGrade(grade: string): grade is ConditionGrade {
  return grade in CONDITION_GRADES;
}

export function AuctionDetailClient({
  initialData,
  showVerificationStamp = false,
}: {
  initialData: AuctionDetailResponse;
  showVerificationStamp?: boolean;
}) {
  const auctionId = initialData.auction.id;

  // Realtime subscription
  useAuctionRealtime(auctionId);

  // Sync state via react-query
  const { data } = useAuctionDetailQuery(auctionId, initialData);

  const auction = data?.auction ?? initialData.auction;
  const bids = data?.bids ?? initialData.bids;
  const eligibility = data?.eligibility ?? initialData.eligibility;
  const product = auction.product;
  const details = auction.product_details;
  const hasDetails = hasAuctionProductDetails(details);
  const inspectionImages = details?.condition.images ?? [];

  const images: string[] = Array.isArray(product?.images) && product.images.length > 0
    ? (product.images as string[])
    : product?.thumbnail
    ? [product.thumbnail]
    : ["/images/placeholder.png"];

  const [selectedImage, setSelectedImage] = useState(images[0]);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [specsExpanded, setSpecsExpanded] = useState(false);
  const [productSpecsCollapsed, setProductSpecsCollapsed] = useState(false);
  const [newBidAlert, setNewBidAlert] = useState<{ amount: number; bidder?: string } | null>(null);
  const [binModalOpen, setBinModalOpen] = useState(false);
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [binError, setBinError] = useState<string | null>(null);

  const prevPriceRef = useRef(auction.current_price);
  const buyNowMutation = useBuyNowMutation(auction.id);

  useEffect(() => {
    if (auction.current_price > prevPriceRef.current) {
      const bidderName = bids[0]?.bidder_display ?? undefined;
      const latestBidIsMine = Boolean(
        eligibility?.is_winning ||
        bids[0]?.is_current_user
      );
      let timer: ReturnType<typeof setTimeout> | undefined;

      if (!latestBidIsMine) {
        setNewBidAlert({
          amount: auction.current_price,
          bidder: bidderName,
        });
        toast.info(
          `Lượt đặt giá mới: ${formatVND(auction.current_price)}${bidderName ? ` • ${bidderName}` : ""}`,
          { title: "🔥 Đặt giá mới" }
        );
        timer = setTimeout(() => setNewBidAlert(null), 3000);
      } else {
        setNewBidAlert(null);
      }
      prevPriceRef.current = auction.current_price;
      return () => {
        if (timer) clearTimeout(timer);
      };
    }
    prevPriceRef.current = auction.current_price;
  }, [auction.current_price, bids, eligibility?.is_winning]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép liên kết phiên đấu giá vào bộ nhớ tạm");
    }
  };

  const handleConfirmBuyNow = async () => {
    setBinError(null);
    try {
      await buyNowMutation.mutateAsync();
      setBinModalOpen(false);
      toast.success("Mua ngay thành công! Vui lòng tiến hành thanh toán.");
    } catch (err: any) {
      setBinError(err.message || "Không thể thực hiện mua ngay");
    }
  };

  const isWinner = eligibility?.is_winning && auction.status === "ended";
  const deadlinePassed = auction.winner_deadline
    ? new Date(auction.winner_deadline) < new Date()
    : false;
  const canCheckout = isWinner && !auction.order_id && !deadlinePassed;

  return (
    <div className="mx-auto max-w-5xl rounded-3xl border border-surface-border bg-white p-4 shadow-[0_4px_20px_-2px_rgba(27,28,26,0.05)] sm:p-6">
      {/* Winner Checkout Alert Banner */}
      {canCheckout && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-primary/20 to-emerald-500/20 border border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center flex-shrink-0 shadow-md">
              <Trophy size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                🎉 Bạn đã chiến thắng phiên đấu giá này!
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mức giá thắng cuộc:{" "}
                <strong className="text-primary font-mono font-bold">
                  {formatVND(auction.current_price)}
                </strong>
                . Vui lòng hoàn tất đặt hàng trước hạn.
              </p>
            </div>
          </div>

          <Link
            href={`/auctions/${auction.id}/checkout`}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-content font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
          >
            <ShoppingBag size={18} />
            <span>Tiến hành thanh toán</span>
          </Link>
        </div>
      )}

      {/* 2-COLUMN GRID WRAPPER (matches mockup #auction-grid) */}
      <div id="auction-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
        {/* LEFT COLUMN: Gallery & Product Specs (7 cols desktop) */}
        <div id="left-col" className="lg:col-span-7 space-y-4">
          {/* Main Hero Gallery Image */}
          <div className="relative aspect-[4/3] w-full bg-surface-container rounded-2xl overflow-hidden border border-surface-border shadow-xs">
            <Image
              id="main-product-img"
              src={selectedImage || "/images/placeholder.png"}
              alt={product?.name ?? "Sản phẩm đấu giá"}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
            />

            {/* Top Badges Overlay */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
              <div className="flex items-center gap-2 pointer-events-auto">
                <AuctionStatusBadge
                  status={auction.status}
                  startsAt={auction.starts_at}
                  endsAt={auction.ends_at}
                />
                {auction.is_featured && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow-md">
                    ✨ Hot Drop
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md border border-surface-border flex items-center justify-center text-foreground hover:text-primary shadow-sm transition-colors"
                  title="Chia sẻ liên kết"
                >
                  <Share2 size={14} />
                </button>
              </div>
            </div>

            {/* Live New Bid Alert Pill */}
            <div
              className={`absolute top-12 left-3 transition-all duration-300 transform pointer-events-none z-10 ${
                newBidAlert ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
              }`}
            >
              <div className="px-3 py-1.5 rounded-full bg-neutral-900/90 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg border border-white/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  🔥 Giá mới: {formatVND(newBidAlert?.amount ?? auction.current_price)}
                  {newBidAlert?.bidder ? ` • ${newBidAlert.bidder}` : ""}
                </span>
              </div>
            </div>

            {/* Anti-Snipe Status Pill (Bottom Left overlay) */}
            {auction.anti_snipe_minutes > 0 && (
              <div className="absolute bottom-3 left-3 pointer-events-none">
                <div className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md border border-surface-border flex items-center gap-2 text-xs shadow-sm">
                  <span className="text-amber-500">🛡️</span>
                  <span className="text-foreground font-semibold text-[11px]">
                    Bù giờ: <strong>+{auction.anti_snipe_minutes} phút</strong> nếu có bid cuối
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Thumbnails Strip */}
          <div className="flex items-center gap-2">
            <ProductThumbnailStrip
              images={images}
              activeIndex={Math.max(0, images.indexOf(selectedImage))}
              onSelect={(index) => setSelectedImage(images[index])}
              productName={product?.name ?? "Sản phẩm đấu giá"}
            />
          </div>

          {/* Specs & Eligibility Card (Compact & Expandable for Mobile) */}
          <div
            id="rules-container-card"
            className="p-[14px] rounded-2xl bg-surface-container-low border border-surface-border space-y-2.5 transition-all"
          >
            {/* Header bar with interactive toggle */}
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setRulesExpanded((prev) => !prev)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-foreground whitespace-nowrap">
                  Điều kiện tham gia
                </span>
                {eligibility?.code !== "already_highest_bidder" && <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 flex-shrink-0 ${
                    eligibility?.can_bid
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      eligibility?.can_bid ? "bg-emerald-600" : "bg-amber-600"
                    }`}
                  />
                  <span>{eligibility?.can_bid ? "Đủ điều kiện đặt giá" : `Chưa đủ điều kiện${eligibility?.message ? `: ${eligibility.message}` : " đặt giá"}`}</span>
                </span>}
              </div>
              <button
                type="button"
                aria-expanded={rulesExpanded}
                onClick={(event) => {
                  event.stopPropagation();
                  setRulesExpanded((prev) => !prev);
                }}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-container text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground"
                aria-label={rulesExpanded ? "Thu gọn điều kiện" : "Mở rộng điều kiện"}
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${rulesExpanded ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {/* 1. COMPACT VERSION */}
            {!rulesExpanded && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-surface-border text-foreground flex items-center gap-1 shadow-2xs">
                  <span>🎖️</span> Level {auction.required_customer_level}+ {auction.required_customer_level === 0 ? "(Tất cả)" : ""}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-surface-border text-foreground flex items-center gap-1 shadow-2xs">
                  <span>♾️</span> {auction.max_bids_per_user ? `Tối đa ${auction.max_bids_per_user} bid` : "Không giới hạn bid"}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-surface-border text-emerald-700 font-bold flex items-center gap-1 shadow-2xs">
                  <span>⚡</span> Freeship Hỏa tốc
                </span>
              </div>
            )}

            {/* 2. EXPANDED VERSION */}
            {rulesExpanded && (
              <div className="space-y-2.5 pt-2.5 border-t border-border/60">
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-surface-border">
                    <span className="text-[10px] text-muted-foreground block">Cấp bậc yêu cầu</span>
                    <span className="font-bold text-foreground">
                      {auction.required_customer_level > 0 ? `Level ${auction.required_customer_level}` : "Level 0+ (Tất cả)"}
                    </span>
                  </div>
                    <div className="p-2.5 rounded-xl bg-white border border-surface-border">
                    <span className="text-[10px] text-muted-foreground block">Giới hạn bid</span>
                    <span className="font-bold text-foreground">
                      {auction.max_bids_per_user ? `${auction.max_bids_per_user} lượt` : "Không giới hạn"}
                    </span>
                  </div>
                    <div className="p-2.5 rounded-xl bg-white border border-surface-border">
                    <span className="text-[10px] text-muted-foreground block">Vận chuyển</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Freeship Hỏa tốc</span>
                  </div>
                </div>
                <div className="rounded-xl border border-surface-border bg-white p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  <span>
                    💡 <strong className="font-bold">Lưu ý:</strong> Người thắng cần hoàn tất thanh toán trong {auction.winner_checkout_hours}h. Sau thời gian này hệ thống sẽ cascade chuyển lượt cho bidder thứ 2.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* DETAILED PRODUCT & VARIANT SPECIFICATIONS SECTION */}
          <div
            id="product-specs-card"
            className="p-[14px] rounded-2xl bg-white border border-surface-border space-y-5 shadow-xs"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold flex-shrink-0">
                  <Box size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-extrabold text-foreground uppercase tracking-wider truncate">
                    Chi tiết sản phẩm
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setProductSpecsCollapsed((prev) => !prev)}
                className="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                title="Thu gọn / Mở rộng"
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${productSpecsCollapsed ? "-rotate-90" : ""}`}
                />
              </button>
            </div>

            {/* Product Specs Body Container */}
            {!productSpecsCollapsed && (
              <div className="space-y-[14px]">
                {/* Variant Highlight Card */}
                {details?.specs.length ? <div
                  id="spec-variant-card"
                  className="rounded-xl bg-surface-container-low border border-surface-border p-[14px] space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/70">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-extrabold text-foreground truncate block">Cấu hình</span>
                      </div>
                    </div>
                    {product?.slug && (
                      <span className="flex-shrink-0 rounded border border-surface-border bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                        #{product.slug.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Technical Specifications */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">
                      {/* Column 1: Core Specs (4 items) */}
                      {details.specs.map((spec) => <div key={spec.label} className="space-y-0.5 border-b border-surface-border/60 py-2">
                        <span className="block text-[11px] font-medium text-muted-foreground">{spec.label}</span>
                        <span className="block break-words text-xs font-bold leading-snug text-foreground">{spec.value}</span>
                      </div>)}
                    </div>

                    {/* Mobile Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setSpecsExpanded((prev) => !prev)}
                      className="sm:hidden w-full mt-2 py-2 rounded-xl bg-surface hover:bg-surface-container border border-border text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <span>{specsExpanded ? "Thu gọn thông số" : "Xem thêm 4 thông số chi tiết"}</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${specsExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>
                </div> : null}

                {/* DEDICATED PRODUCT CONDITION & ATTACHED INSPECTION PHOTOS */}
                {details?.condition && hasDetails && (details.condition.grade || details.condition.summary.length > 0 || details.condition.attributes.length > 0 || inspectionImages.length > 0) && <div
                  id="spec-condition-card"
                  className="rounded-xl bg-surface-container-low border border-surface-border p-[14px] space-y-3.5"
                >
                  <div className="flex items-start gap-2.5 pb-2.5 border-b border-border">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
                      <Camera size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs sm:text-sm font-extrabold text-foreground uppercase tracking-wider">
                            Tình trạng thực tế
                          </h3>
                          <button
                            type="button"
                            onClick={() => setGradeModalOpen(true)}
                            className={`flex-shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-colors shadow-2xs group flex items-center gap-1 ${isConditionGrade(details.condition.grade) ? CONDITION_GRADES[details.condition.grade].badge : "border-surface-border bg-surface-container text-foreground"}`}
                            title="Nhấn để xem quy chuẩn phân cấp Grade từ S đến D"
                          >
                            <span>Bậc {details.condition.grade}</span>
                            <Info size={11} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">Chụp trực tiếp bởi NoobStore • Không qua chỉnh sửa</p>
                      </div>
                    </div>
                  </div>

                  {/* Condition Assessment */}
                  <div className="p-3 rounded-xl bg-white border border-surface-border space-y-2 text-xs">
                    {(details.condition.summary.length > 0 || details.condition.attributes.length > 0) && <div className="pb-1 text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Đánh giá chi tiết tình trạng</div>}

                    {/* 1. Text Summary Description */}
                    {details.condition.summary.length > 0 && <div className="p-2.5 rounded-lg bg-surface-container-low text-xs space-y-1.5">
                      {details.condition.summary.map((item, i) => <div key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0" /><span className="text-foreground font-medium text-[11px]">{item}</span></div>)}
                    </div>}

                    {/* 2. Structured Key-Value Attribute Cards (2 lines: label top, value bottom) */}
                    {details.condition.attributes.length > 0 && <div id="condition-attributes-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                      {details.condition.attributes.map((item) => <div key={item.label} className="flex flex-col items-start p-2.5 rounded-lg bg-surface-container-low space-y-0.5">
                        <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider block">{item.label}</span>
                        <span className="font-bold text-foreground text-xs block leading-snug break-words">{item.value}</span>
                      </div>)}
                    </div>}
                  </div>

                  {/* Attached Inspection Photos Grid */}
                  {inspectionImages.length > 0 && <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
                        <Camera size={13} />
                        Ảnh kiểm tra tình trạng ({inspectionImages.length} ảnh)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {inspectionImages.slice(0, 4).map((img, idx) => (
                        <figure key={idx} className="min-w-0 space-y-1">
                        <button
                          type="button"
                          onClick={() => setSelectedImage(img)}
                          className="group relative rounded-xl overflow-hidden border border-border bg-surface aspect-[4/3] text-left transition-all hover:border-primary/50 shadow-2xs"
                        >
                          <Image
                            src={img}
                            alt={`Ảnh kiểm định ${idx + 1}`}
                            fill
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </button>
                        {details?.condition.image_captions[idx]?.trim() && <figcaption className="text-center text-xs text-muted-foreground">{details.condition.image_captions[idx]}</figcaption>}
                        </figure>
                      ))}
                    </div>
                  </div>}

                  {/* Verification Stamp Footer */}
                  {showVerificationStamp && (
                    <div className="p-2.5 rounded-lg bg-surface border border-border/80 text-[11px] text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0" />
                        <span>Kiểm định viên: <strong className="text-foreground">Hoàng Long (NoobStore QC)</strong></span>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground pl-3 border-t border-border/40 pt-1">
                        Mã tem: #QC-AUCT-{auction.id.slice(0, 8).toUpperCase()}
                      </div>
                    </div>
                  )}
                </div>}

                {/* In the Box / Accessories */}
                {details?.accessories.length ? <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Box size={14} />
                    <span>Bộ phụ kiện đi kèm trong hộp</span>
                  </h4>
                  <div className="rounded-xl bg-surface-container-low border border-border/60 p-[14px] text-xs space-y-1.5">
                    {details.accessories.map((item, index) => <div key={`${index}-${item}`} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0" /><span className="text-foreground font-medium break-words">{item.trim()}</span></div>)}
                  </div>
                </div> : null}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Price, Countdown & Live Action Bidding (5 cols desktop) */}
        <div id="right-col" className="space-y-4 lg:col-span-5">
          {/* Product Title Section */}
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="uppercase tracking-widest text-primary font-bold">
                {product?.brand || "ĐẤU GIÁ CHÍNH HÃNG"}
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <Users size={13} />
                <span>{auction.unique_bidders ?? 0} người tham gia</span>
              </span>
            </div>
            <h1 className="text-[18px] font-extrabold text-foreground leading-snug">
              {product?.name ?? "Sản phẩm đấu giá"}
            </h1>
          </div>

          {/* Countdown Banner */}
          <div id="timer-box" className="rounded-2xl bg-surface-container-low transition-colors">
            <AuctionTimer
              endsAt={auction.ends_at}
              startsAt={auction.starts_at}
              variant="banner"
            />
          </div>

          {/* PRICING CARD */}
          <div
            id="pricing-card"
            className="p-3 sm:p-4 rounded-2xl bg-surface-container-low border border-surface-border space-y-3 shadow-[0_2px_10px_-4px_rgba(27,28,26,0.08)]"
          >
            {/* Row 1: Giá hiện tại header + badge dẫn đầu */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Giá hiện tại
              </span>
              {eligibility?.is_winning && (
                <span className="winning-bid-badge relative isolate inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-black">
                  <span className="relative z-10 h-1.5 w-1.5 rounded-full bg-black" />
                  <span className="relative z-10">Bạn đang dẫn đầu</span>
                </span>
              )}
            </div>

            {/* Big Main Price */}
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-2xl sm:text-[28px] font-extrabold text-primary tracking-tight">
                {formatVND(auction.current_price)}
              </span>
            </div>

            {/* Comparison Grid: Khởi điểm & Bước giá (12px padding: p-3) */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-surface-border/80">
              <div className="p-3 rounded-xl bg-white border border-surface-border space-y-1 shadow-2xs">
                <span className="text-[11px] text-muted-foreground block font-medium">Giá khởi điểm:</span>
                <span className="font-mono font-extrabold text-foreground text-sm sm:text-base block">
                  {formatVND(auction.starting_price)}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-surface-border space-y-1 shadow-2xs">
                <span className="text-[11px] text-muted-foreground block font-medium">Bước giá tối thiểu:</span>
                <span className="font-mono font-extrabold text-foreground text-sm sm:text-base block">
                  +{auction.increment_type === "percentage" ? `${auction.increment_value}%` : formatVND(auction.increment_value)}
                </span>
              </div>
            </div>

            {/* Buy Now (BIN) Row */}
            {auction.bin_price && (
              <div
                id="bin-container"
                className="p-3 rounded-xl bg-[#fff9ee] border border-amber-200/70 flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
                    Mua ngay (BIN)
                  </span>
                  <span className="font-mono font-extrabold text-amber-900 text-base">
                    {formatVND(auction.bin_price)}
                  </span>
                </div>
                {auction.status === "active" && (
                  <button
                    type="button"
                    onClick={() => setBinModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs transition-all active:scale-95 shadow-sm"
                  >
                    Chốt ngay
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Interactive Bidding Form */}
          {auction.status === "active" && (
            <div id="bid-form-container">
              <BidForm auction={auction} eligibility={eligibility} />
            </div>
          )}

          {/* Live Bid History Stream */}
          <div className="space-y-2">
            <BidHistory bids={bids} currentPrice={auction.current_price} />
          </div>
        </div>
      </div>

      {/* Buy Now Modal Backdrop */}
      {binModalOpen && auction.bin_price && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-surface border border-amber-300 dark:border-amber-700 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <span>⚡ Xác nhận Mua Ngay (BIN)</span>
              </h3>
              <button
                type="button"
                onClick={() => setBinModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Bạn sắp mua đứt sản phẩm này với mức giá chốt ngay:
            </p>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
              <div className="font-mono text-2xl font-extrabold text-amber-900 dark:text-amber-200">
                {formatVND(auction.bin_price)}
              </div>
              <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                Phiên đấu giá sẽ kết thúc ngay lập tức
              </div>
            </div>

            {binError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{binError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBinModalOpen(false)}
                disabled={buyNowMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-foreground text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmBuyNow}
                disabled={buyNowMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-extrabold shadow-md animate-pulse disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {buyNowMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>Xác nhận mua</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade S -> D Rubric Modal Backdrop */}
      {gradeModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-surface border border-border p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-fixed text-primary flex items-center justify-center font-bold">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Tiêu chuẩn phân cấp Grade (S → D)</h3>
                  <p className="text-[11px] text-muted-foreground">Quy chuẩn đánh giá tình trạng minh bạch tại NoobStore</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGradeModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high text-muted-foreground hover:text-foreground flex items-center justify-center text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {(Object.entries(CONDITION_GRADES) as [ConditionGrade, (typeof CONDITION_GRADES)[ConditionGrade]][]).map(([grade, config]) => {
                const isCurrentGrade = details?.condition.grade === grade;
                return (
                  <div key={grade} aria-current={isCurrentGrade ? "true" : undefined} className={`space-y-1 rounded-xl border p-3 ${isCurrentGrade ? "border-2 border-emerald-500/80 bg-emerald-50/80" : "border-surface-border bg-surface-container-low"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${config.badge}`}>Grade {grade}</span>
                        <span className={`text-xs font-extrabold ${isCurrentGrade ? "text-emerald-950" : "text-foreground"}`}>{config.label}</span>
                      </div>
                      {isCurrentGrade && <span className="whitespace-nowrap rounded-full border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700">Sản phẩm hiện tại</span>}
                    </div>
                    <p className={`text-[11px] leading-relaxed ${isCurrentGrade ? "text-emerald-900" : "text-muted-foreground"}`}>{config.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setGradeModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs transition-colors shadow-sm"
              >
                Đã hiểu tiêu chuẩn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
