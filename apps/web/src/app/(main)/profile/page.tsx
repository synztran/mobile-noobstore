"use client";

import { updateProfileName } from "@/app/actions/profile";
import Icon from "@/components/ui/Icon";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  {
    icon: "shopping_bag",
    label: "Đơn hàng của tôi",
    href: "/profile/orders",
  },
  {
    icon: "favorite",
    label: "Sản phẩm yêu thích",
    href: "/wishlist",
  },
  {
    icon: "location_on",
    label: "Địa chỉ giao hàng",
    href: "/profile/addresses",
  },
  // { icon: "payment", label: "Phương thức thanh toán" },
  {
    icon: "notifications",
    label: "Thông báo",
    href: "/profile/notifications",
  },
  {
    icon: "redeem",
    label: "Đổi thưởng",
    href: "/rewards",
  },
  {
    icon: "help",
    label: "Trợ giúp & Hỗ trợ",
    href: "/profile/support",
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);

  useEffect(() => {
    if (profile?.first_name) {
      const name = [profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(" ");
      setFullName(name);
    }
  }, [profile]);

  // Fetch NSP points balance
  useEffect(() => {
    if (!user) return;
    fetch("/api/points/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setPointsBalance(d.balance ?? 0))
      .catch(() => {});
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    router.push("/login");
  };

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setSaving(true);
    const { error } = await updateProfileName(fullName);
    setSaving(false);
    if (error) {
      toast.error("Could not save profile");
      return;
    }
    await refreshProfile();
    toast.success("Profile updated");
    setEditing(false);
  };

  const handleEditToggle = () => {
    setEditing((v) => {
      if (!v) setTimeout(() => inputRef.current?.focus(), 50);
      return !v;
    });
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
    <div className="px-6 pt-4">
      {/* Avatar & name */}
      <div
        className={`mb-8 flex items-center gap-4 ${!user ? "justify-center" : ""}`}
      >
        <div className="primary-gradient flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full">
          <span className="text-xl font-black text-white">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") setEditing(false);
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

      {/* NSP Points Balance */}
      {user && (
        <Link
          href="/profile/points"
          className="mb-2 flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 px-5 py-4 shadow-ambient-sm transition-transform active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Icon name="stars" className="text-lg text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white/90">Điểm NoobStore</p>
              {pointsBalance === null ? (
                <div className="mt-0.5 h-5 w-16 animate-pulse rounded-full bg-white/30" />
              ) : (
                <p className="text-lg font-black leading-none text-white">
                  {pointsBalance.toLocaleString("vi-VN")}
                </p>
              )}
            </div>
          </div>
          <Icon name="chevron_right" className="text-lg text-white/70" />
        </Link>
      )}

      {/* Menu items */}
      <div className={`space-y-3 ${!user ? "sr-only" : ""}`}>
        {NAV_ITEMS.map(({ icon, label, href }) => (
          <Link
            key={label}
            href={href}
            className="flex w-full items-center gap-4 rounded-2xl bg-surface-container-lowest px-5 py-4 shadow-ambient-sm transition-colors hover:bg-surface-container-low"
          >
            <Icon name={icon} className="text-primary" />
            <span className="font-semibold text-on-surface">{label}</span>
            <Icon
              name="chevron_right"
              className="ml-auto text-outline-variant"
            />
          </Link>
        ))}
      </div>

      {/* Auth CTA */}
      <div className="mt-8 space-y-3">
        {user ? (
          <button
            onClick={handleSignOut}
            className="btn h-auto w-full rounded-2xl border-0 bg-surface-container py-4 font-bold normal-case text-error"
          >
            <Icon name="logout" className="mr-2" />
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
  );
}
