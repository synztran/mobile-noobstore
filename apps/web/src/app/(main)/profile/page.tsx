"use client";

import { updateProfileName } from "@/modules/user/server/actions";
import { RankBadge } from "@/components/rank/RankBadge";
import { RankBenefitModal } from "@/components/rank/RankBenefitModal";
import {
  RankProgressCard,
  RankProgressCardSkeleton,
} from "@/components/rank/RankProgressCard";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Gavel,
  Heart,
  LogOut,
  MapPin,
  Newspaper,
  Package,
  Star,
  ShoppingBag,
  Clock3,
} from "lucide-react";
import { useAuth } from "@/modules/user/client/AuthProvider";
import type { ProfileAddress } from "@/modules/user/types";
import { useMyRank } from "@/lib/react-query/rank/api/useRankQueries";
import { useOrders } from "@/lib/react-query/order/api/useOrderQueries";
import type { OrderSummary } from "@/app/api/user/orders/route";
import { formatVND } from "@/lib/currency";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DesktopAccountSidebar } from "@/components/profile/DesktopAccountSidebar";

const NAV_ITEMS = [
  { icon: <ShoppingBag size={20} />, label: "Đơn hàng của tôi", href: "/profile/orders" },
  { icon: <Gavel size={20} />, label: "Đấu giá của tôi", href: "/profile/auctions" },
  { icon: <Heart size={20} />, label: "Sản phẩm yêu thích", href: "/wishlist" },
  { icon: <MapPin size={20} />, label: "Địa chỉ giao hàng", href: "/profile/addresses" },
  { icon: <Bell size={20} />, label: "Thông báo", href: "/profile/notifications" },
  { icon: <Package size={20} />, label: "Hàng sắp về", href: "/profile/stock-alerts" },
  { icon: <Newspaper size={14} />, label: "Tin tức & Ưu đãi", href: "/news" },
  { icon: <CircleHelp size={20} />, label: "Trợ giúp & Hỗ trợ", href: "/profile/support" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [rankModalOpen, setRankModalOpen] = useState(false);
  const { data: rankData } = useMyRank();
  const { data: recentOrdersData, isLoading: recentOrdersLoading, isError: recentOrdersError } = useOrders({ q: "", status: "all" });
  const recentOrders = recentOrdersData?.pages?.[0]?.orders?.slice(0, 3) ?? [];
  const pointsBalance = profile?.points_balance;
  const profileAddresses: unknown = (profile as typeof profile & { addresses?: unknown } | null)?.addresses;
  const defaultAddress = Array.isArray(profileAddresses)
    ? profileAddresses.find(
        (address): address is ProfileAddress =>
          typeof address === "object" &&
          address !== null &&
          !Array.isArray(address) &&
          (address as Partial<ProfileAddress>).is_default === true &&
          typeof (address as Partial<ProfileAddress>).address === "string" &&
          typeof (address as Partial<ProfileAddress>).ward === "string" &&
          typeof (address as Partial<ProfileAddress>).district === "string" &&
          typeof (address as Partial<ProfileAddress>).city === "string"
      )
    : undefined;
  const addressParts = defaultAddress
    ? [defaultAddress.address, defaultAddress.ward, defaultAddress.district, defaultAddress.city]
    : [];
  const addressText =
    addressParts.length === 4 && addressParts.every((part) => part.trim().length > 0)
      ? addressParts.join(", ")
      : "";
  const addressPhone =
    typeof defaultAddress?.phone_number === "string" &&
    defaultAddress.phone_number.trim().length > 0
      ? defaultAddress.phone_number
      : null;
  const priorName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    user?.user_metadata.full_name ||
    "";

  useEffect(() => {
    setFullName(priorName);
  }, [priorName]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.push("/login");
  };

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    try {
      const { error } = await updateProfileName(fullName);
      if (error) {
        toast.error("Could not save profile");
        return;
      }
      await refreshProfile();
      toast.success("Profile updated");
      setEditing(false);
    } catch {
      toast.error("Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleEditToggle = () => {
    setEditing((v) => {
      if (!v) setTimeout(() => inputRef.current?.focus(), 50);
      return !v;
    });
  };

  const handleCancelEdit = () => {
    setFullName(priorName);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="min-main-content flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const displayName =
    ([profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
      user?.email?.split("@")[0]) ??
    "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
    {user ? (
      <div className="hidden px-6 pb-16 pt-8 lg:block">
        <div className="mx-auto grid max-w-7xl grid-cols-[15rem_minmax(0,1fr)] gap-8">
          <DesktopAccountSidebar activeHref="/profile" />

          <main className="min-w-0">
            <h1 className="mb-6 text-3xl font-extrabold text-on-surface">Tổng quan tài khoản</h1>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <section className="rounded-xl bg-surface-container-lowest p-5 shadow-ambient-sm" aria-labelledby="desktop-points-heading">
                <h2 id="desktop-points-heading" className="text-xl font-extrabold text-on-surface">Điểm NoobStore</h2>
                <p className="mt-2 text-sm text-on-surface-variant">Tích lũy điểm và đổi những phần quà dành riêng cho bạn.</p>
                <p className="mt-4 text-4xl font-black text-primary">{pointsBalance === undefined ? <span className="loading loading-dots loading-md" aria-label="Đang tải điểm" /> : pointsBalance.toLocaleString("vi-VN")}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/profile/points" className="btn btn-primary rounded-xl">Lịch sử điểm</Link>
                  <Link href="/rewards" className="btn rounded-xl bg-surface-container text-on-surface">Khám phá đổi thưởng</Link>
                </div>
              </section>
              <section className="rounded-xl bg-surface-container-lowest p-5 shadow-ambient-sm" aria-labelledby="desktop-profile-heading">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h2 id="desktop-profile-heading" className="text-xl font-extrabold text-on-surface">Thông tin cá nhân</h2><p className="mt-1 truncate text-sm text-on-surface-variant">{user.email}</p></div>
                  {!editing && <button onClick={handleEditToggle} className="btn btn-sm rounded-xl bg-surface-container text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Chỉnh sửa</button>}
                </div>
                {editing ? <div className="mt-3 space-y-2">
                  <label htmlFor="desktop-profile-name" className="text-sm font-semibold text-on-surface">Họ và tên</label>
                   <input id="desktop-profile-name" ref={inputRef} value={fullName} onChange={(e) => setFullName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancelEdit(); }} className="input input-bordered w-full rounded-xl bg-base-100" placeholder="Your name" />
                   <div className="flex gap-2"><button onClick={handleSave} disabled={saving || !fullName.trim()} className="btn btn-primary rounded-xl" aria-label="Lưu">{saving ? <span className="loading loading-spinner loading-sm" aria-hidden="true" /> : "Lưu"}</button><button onClick={handleCancelEdit} disabled={saving} className="btn rounded-xl bg-surface-container">Hủy</button></div>
                   <p role="status" aria-live="polite" className="sr-only">{saving ? "Đang lưu hồ sơ" : ""}</p>
                  </div> : <p className="mt-2 text-lg font-bold text-on-surface">{displayName}</p>}
                 <div className="mt-3 border-t border-outline-variant/40 pt-3">
                  <h3 className="text-sm font-bold text-on-surface">Địa chỉ giao hàng mặc định</h3>
                  {addressText ? (
                    <div className="mt-2 space-y-1 text-sm text-on-surface-variant">
                      <p>{addressText}</p>
                      {addressPhone && <p>{addressPhone}</p>}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-on-surface-variant">Bạn chưa có địa chỉ mặc định.</p>
                  )}
                   <Link href="/profile/addresses" className="mt-2 inline-flex min-h-11 items-center gap-1 font-semibold text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    {addressText ? "Quản lý địa chỉ" : "Thêm địa chỉ giao hàng"}
                    <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </section>
            </div>
            <section className="mt-5" aria-label="Trạng thái hạng thành viên">
              {rankData?.currentRank ? <RankProgressCard currentRank={rankData.currentRank} nextRank={rankData.nextRank} progress={rankData.progress} onBadgeClick={() => setRankModalOpen(true)} /> : <RankProgressCardSkeleton />}
            </section>
            <RecentOrders orders={recentOrders} isLoading={recentOrdersLoading} isError={recentOrdersError} />
          </main>
        </div>
        {rankData?.currentRank && <RankBenefitModal open={rankModalOpen} onClose={() => setRankModalOpen(false)} currentRank={rankData.currentRank} allRanks={rankData.allRanks} />}
      </div>
    ) : (
      <div className="hidden px-4 pb-16 pt-4 lg:block lg:px-6 lg:pt-8">
        <main className="mx-auto max-w-3xl rounded-xl bg-surface-container-lowest p-8 text-center shadow-ambient-sm">
          <h1 className="text-3xl font-extrabold text-on-surface">Tài khoản NoobStore</h1>
          <p className="mt-3 text-on-surface-variant">Đăng nhập hoặc tạo tài khoản để xem thông tin và đơn hàng của bạn.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center sm:gap-3">
          <Link href="/login" className="primary-gradient btn h-auto w-full rounded-xl border-0 py-4 font-bold normal-case text-white sm:w-auto sm:rounded-xl sm:py-2">Đăng nhập</Link>
          <Link href="/register" className="btn h-auto w-full rounded-xl border-0 bg-surface-container py-4 font-bold normal-case text-on-surface sm:w-auto sm:rounded-xl sm:py-2">Tạo tài khoản</Link>
          </div>
        </main>
      </div>
    )}
    <div className="px-4 pb-16 pt-4 lg:hidden">
      {/* Avatar & name */}
      {user && (
      <div
        className="mb-4 flex items-center gap-4"
      >
        <div className="relative flex-shrink-0">
          <div className="primary-gradient flex h-16 w-16 items-center justify-center rounded-full">
            <span className="text-xl font-black text-white">{initials}</span>
          </div>
          {rankData?.currentRank && (
            <div className="absolute -bottom-1 -right-1">
              <RankBadge
                rank={rankData.currentRank}
                size="sm"
                onClick={() => setRankModalOpen(true)}
                className="ring-2 ring-surface"
              />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancelEdit();
              }}
              className="w-full rounded-xl border-2 border-primary bg-surface-container px-3 py-1.5 text-xl font-black text-on-surface outline-none"
              placeholder="Your name"
            />
          ) : (
            <h2 className="truncate text-2xl font-black text-on-surface">
              {user?.user_metadata.full_name ||
                user?.email ||
                "NoobStore Member"}
            </h2>
          )}
          <p className="mt-0.5 text-sm text-on-surface-variant">
            {user ? user.email : "Thành viên NoobStore"}
          </p>
        </div>
        {/* {user && (
					<div className="flex gap-2 flex-shrink-0">
						{editing ? (
							<>
								<button
									onClick={handleSave}
									disabled={saving}
									className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50">
									{saving ? (
										<span className="loading loading-spinner loading-xs text-white" />
									) : (
										<Icon
											name="check"
											className="text-white text-lg"
										/>
									)}
								</button>
								<button
									onClick={() => setEditing(false)}
									className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
									<Icon
										name="close"
										className="text-on-surface text-lg"
									/>
								</button>
							</>
						) : (
							<button
								onClick={handleEditToggle}
								className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center active:scale-90 transition-transform">
								<Icon
									name="edit"
									className="text-on-surface text-lg"
								/>
							</button>
						)}
					</div>
				)} */}
      </div>
      )}

      {/* NSP Points Balance */}
      {user && (
        <Link
          href="/profile/points"
          className="mb-2 flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-4 shadow-ambient-sm transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Star className="h-5 w-5 fill-current text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white/90">Điểm NoobStore</p>
              {pointsBalance === undefined ? (
                <div className="mt-0.5 h-5 w-16 animate-pulse rounded-full bg-white/30" />
              ) : (
                <p className="text-lg font-black leading-none text-white">
                  {pointsBalance.toLocaleString("vi-VN")}
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-white/70" />
        </Link>
      )}

      {/* Rank Progress */}
      {user && rankData?.currentRank && (
        <div className="mb-2">
          <RankProgressCard
            currentRank={rankData.currentRank}
            nextRank={rankData.nextRank}
            progress={rankData.progress}
            onBadgeClick={() => setRankModalOpen(true)}
          />
        </div>
      )}
      {user && !rankData && <RankProgressCardSkeleton />}

      {user && <RecentOrders orders={recentOrders} isLoading={recentOrdersLoading} isError={recentOrdersError} />}

      {/* Menu items */}
      {user && <div className="space-y-3">
        {NAV_ITEMS.map(({ icon, label, href }) => (
          <Link
            key={label}
            href={href}
            className="flex w-full items-center gap-4 rounded-2xl bg-surface-container-lowest px-5 py-4 shadow-ambient-sm transition-colors hover:bg-surface-container-low"
          >
            <span className="text-primary">{icon}</span>
            <span className="font-semibold text-on-surface">{label}</span>
            <ChevronRight className="ml-auto h-4 w-4 text-outline-variant" />
          </Link>
        ))}
      </div>
      }

      {/* Rank Benefit Modal */}
      {rankData?.currentRank && (
        <RankBenefitModal
          open={rankModalOpen}
          onClose={() => setRankModalOpen(false)}
          currentRank={rankData.currentRank}
          allRanks={rankData.allRanks}
        />
      )}

      {/* Auth CTA */}
      <div className="mt-6 space-y-2">
        {user ? (
          <button
            onClick={handleSignOut}
            className="btn h-auto w-full rounded-2xl border-0 bg-surface-container py-4 font-bold normal-case text-error"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
          </button>
        ) : (
          <>
            <Link
              href="/login"
              className="primary-gradient btn h-auto w-full rounded-2xl border-0 py-4 font-bold normal-case text-white"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="btn h-auto w-full rounded-2xl border-0 bg-surface-container py-4 font-bold normal-case text-on-surface"
            >
              Tạo tài khoản
            </Link>
          </>
        )}
      </div>
    </div>
    </>
  );
}

const ORDER_STATUS: Record<string, string> = {
  pending: "Chờ xác nhận",
  paid: "Đã thanh toán",
  confirmed: "Đã xác nhận",
  first_paid: "Đã đặt cọc",
  second_paid: "Đã thanh toán đủ",
  preparing: "Đang chuẩn bị",
  shipped: "Đang giao",
  delivering: "Đang giao",
  delivered: "Đã giao",
  returning: "Đang hoàn hàng",
  cancelled: "Đã hủy",
  refunded: "Đã hoàn tiền",
};

function RecentOrders({
  orders,
  isLoading,
  isError,
}: {
  orders: OrderSummary[];
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <section className="mt-4 rounded-2xl bg-surface-container-lowest p-4 shadow-ambient-sm" aria-labelledby="recent-orders-heading">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="recent-orders-heading" className="font-extrabold text-on-surface">Đơn hàng gần đây</h2>
        <Link href="/profile/orders" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Xem tất cả <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-2" aria-label="Đang tải đơn hàng">
          {[1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-container" />)}
        </div>
      ) : isError ? (
        <p className="py-2 text-sm text-on-surface-variant">Chưa tải được đơn hàng. Vào mục đơn hàng để thử lại.</p>
      ) : orders.length === 0 ? (
        <p className="py-2 text-sm text-on-surface-variant">Bạn chưa có đơn hàng nào.</p>
      ) : (
        <ul className="divide-y divide-outline-variant/40">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/profile/orders?orderNumber=${encodeURIComponent(order.order_number)}`} className="flex min-h-14 items-center justify-between gap-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-on-surface">#{order.order_number}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-on-surface-variant"><Clock3 size={12} aria-hidden="true" />{new Date(order.created_at).toLocaleDateString("vi-VN")}</span>
                  <span className="mt-2 block space-y-1.5" aria-label="Sản phẩm trong đơn">
                    {order.product_summaries.length > 0
                      ? <>
                          {order.product_summaries.slice(0, 2).map((item, index) => (
                            <span key={`${item.name}-${index}`} className="block truncate text-xs leading-5 text-on-surface-variant">
                              {item.name}{item.variant ? ` · ${item.variant}` : ""}
                            </span>
                          ))}
                          {order.product_summaries.length > 2 && <span className="block text-xs text-on-surface-variant">+{order.product_summaries.length - 2} sản phẩm khác</span>}
                        </>
                      : order.service_line_count > 0 ? "Dịch vụ" : `${order.item_count} sản phẩm`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-extrabold text-on-surface">{formatVND(order.total_price)}</span>
                  <span className="badge badge-sm mt-1 border-0 bg-surface-container text-on-surface-variant">{ORDER_STATUS[order.status] ?? "Đang xử lý"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
