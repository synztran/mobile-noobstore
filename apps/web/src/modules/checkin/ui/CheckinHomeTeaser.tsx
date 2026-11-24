"use client";

import Link from "next/link";
import {
  useClaimCheckin,
  useCheckinCalendar,
  useCheckinRewards,
} from "../client/queries";
import { useState } from "react";
import { useEffect, useRef } from "react";
import { CalendarCheck, ChevronRight, Gift } from "lucide-react";
import { motion, useReducedMotion, type MotionProps } from "motion/react";
import { useAuth } from "@/modules/user/client/AuthProvider";
import { toast } from "@/lib/toast";

function revealProps(reduce: boolean | null, delay: number): MotionProps {
  if (reduce) return {};
  return {
    initial: { opacity: 0, y: 10 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-40px" },
    transition: { duration: 0.32, delay, ease: "easeOut" },
  };
}

export function CheckinHomeTeaser({
  compactDesktop = false,
}: {
  compactDesktop?: boolean;
}) {
  const { user, loading: authLoading } = useAuth();
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const query = useCheckinCalendar(month, { enabled: !authLoading && Boolean(user) });
  const rewardsQuery = useCheckinRewards({ enabled: !authLoading && Boolean(user) });
  const claim = useClaimCheckin();
  const reduceMotion = useReducedMotion();
  const [totalEarned, setTotalEarned] = useState(0);
  useEffect(() => {
    setTotalEarned(query.data?.availablePoints ?? 0);
  }, [query.data?.availablePoints]);
  const [showFloating, setShowFloating] = useState(false);
  const teaserRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = teaserRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFloating(!entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const showGuestTeaser = !authLoading && !user;
  if (authLoading) return null;
  if (showGuestTeaser) {
    return (
      <section
        className="relative isolate overflow-hidden rounded-2xl p-[2px] text-on-surface shadow-ambient-sm lg:border-2 lg:border-outline-variant lg:p-0"
        aria-labelledby="checkin-home-title"
      >
        <div className="relative z-10 flex h-full flex-col rounded-[14px] bg-surface-container-lowest p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="checkin-home-title"
                className="text-lg font-extrabold leading-snug sm:text-xl"
              >
                Điểm danh tích điểm
              </h2>
              <p className="mt-1 text-xs text-on-surface-variant">
                Tích điểm mỗi ngày, đổi voucher cho đơn hàng tiếp theo.
              </p>
            </div>
            <Link
              className="group inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:text-primary-container"
              href="/checkin"
            >
              <span>Tìm hiểu</span>
              <ChevronRight
                size={14}
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>

          <div className="mt-6 rounded-xl bg-surface-container-low p-4 sm:p-5">
            <p className="text-sm font-bold text-on-surface">
              Một lần ghé thăm, thêm điểm thưởng
            </p>
            <ul className="mt-3 space-y-2 text-sm text-on-surface-variant">
              <li className="flex items-center justify-between gap-3">
                <span>Ngày thường</span>
                <strong className="text-base font-extrabold text-success">
                  +1 điểm
                </strong>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Cuối tuần</span>
                <strong className="text-base font-extrabold text-primary">
                  +2 điểm
                </strong>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Ngày lễ</span>
                <strong className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-400/15 px-2.5 py-1 text-sm font-extrabold text-amber-700">
                  <Gift aria-hidden="true" className="h-4 w-4" />
                  Quà đặc biệt
                </strong>
              </li>
              <li className="pt-1 text-xs">
                Bỏ lỡ ngày nào cũng không mất điểm
              </li>
            </ul>
          </div>

          <div className="mt-auto pt-6">
            <p className="mb-2 text-xs text-on-surface-variant">
              Đăng nhập để điểm danh, xem điểm và nhận voucher.
            </p>
            <Link href="/login?next=%2F" className="btn btn-primary w-full">
              Đăng nhập để bắt đầu
            </Link>
            <p className="mt-2 text-center text-xs text-on-surface-variant">
              Điểm danh của bạn được lưu theo tài khoản.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (query.isLoading || query.isError || !query.data?.enabled) return null;
  const today = query.data.days.find((day) => day.state === "today");
  const weekdayPoints = query.data.weekdayPoints ?? 1;
  const weekendPoints = query.data.weekendPoints ?? 2;
  const availablePoints = query.data.availablePoints;

  const rewards = rewardsQuery.data ?? [];
  const activeRewards = rewards
    .filter((r) => r.points_cost > 0)
    .sort((a, b) => a.points_cost - b.points_cost);

  const nextReward =
    activeRewards.find((r) => r.points_cost >= availablePoints) ??
    activeRewards[activeRewards.length - 1];

  const nextRewardPoints = nextReward
    ? nextReward.points_cost
    : weekdayPoints * 15;

  const progress = Math.min(
    100,
    Math.round((availablePoints / nextRewardPoints) * 100)
  );
  async function quickClaim() {
    if (claim.isPending) return;
    try {
      const result = await claim.mutateAsync();
      toast.success(
        result.alreadyCheckedIn
          ? "Bạn đã điểm danh hôm nay rồi."
          : `Bạn đã điểm danh thành công: +${result.pointsAwarded} điểm chuyên cần`
      );
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Không thể điểm danh lúc này"
      );
    }
  }
  return (
    <>
      <section
        ref={teaserRef}
        className="relative isolate overflow-hidden rounded-2xl p-[2px] text-on-surface shadow-ambient-sm lg:border-2 lg:border-outline-variant lg:p-0"
        aria-labelledby="checkin-home-title"
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl p-[2px] opacity-100 [mask-composite:exclude] [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] lg:hidden"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg 275deg, #ff0000 282deg, #ff7f00 294deg, #ffff00 306deg, #00ff00 318deg, #0000ff 330deg, #4b0082 342deg, #9400d3 354deg, transparent 360deg)",
          }}
          animate={reduceMotion ? undefined : { rotate: 360 }}
          initial={{ rotate: 0 }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 4, ease: "linear", repeat: Infinity }
          }
        />
        <div className="relative z-10 rounded-[14px] bg-surface-container-lowest p-4 sm:p-6">
          <motion.div
            {...revealProps(reduceMotion, 0.02)}
            className="flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <h2
                id="checkin-home-title"
                className="text-lg font-extrabold leading-snug sm:text-xl"
              >
                Điểm danh tích điểm
              </h2>
            </div>
            <Link
              className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:text-primary-container"
              href="/checkin"
            >
              <span>Xem thêm</span>
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          </motion.div>
          <p className="mt-1 hidden text-xs text-on-surface-variant sm:block">
            Điểm danh mỗi ngày để tích điểm đổi voucher, bỏ lỡ không mất điểm.
          </p>
          <div
            className={`mt-5 grid gap-4 md:grid-cols-[minmax(0,auto)_minmax(0,1fr)_minmax(200px,240px)] md:items-center md:gap-6 lg:gap-10 ${
              compactDesktop ? "lg:grid-cols-1 lg:items-stretch lg:gap-4" : ""
            }`}
          >
            <motion.div
              {...revealProps(reduceMotion, 0.08)}
              className="flex items-center justify-between gap-3 md:block md:space-y-1.5"
            >
              <p className="flex items-baseline gap-1.5">
                <strong className="text-3xl font-extrabold tabular-nums leading-none text-on-surface">
                  {totalEarned}
                </strong>
                <span className="text-xs text-on-surface-variant">
                  điểm tháng này
                </span>
              </p>
              {query.data.earliestExpiry && (
                <span className="inline-block shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                  Hết hạn{" "}
                  {new Intl.DateTimeFormat("vi-VN", {
                    day: "numeric",
                    month: "numeric",
                    timeZone: "Asia/Ho_Chi_Minh",
                  }).format(new Date(query.data.earliestExpiry))}
                </span>
              )}
            </motion.div>
            <motion.div {...revealProps(reduceMotion, 0.14)}>
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-on-surface-variant">
                <span>Mốc voucher tiếp theo</span>
                <span className="tabular-nums text-on-surface">
                  {availablePoints} / {nextRewardPoints}
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-container-highest"
                role="progressbar"
                aria-label="Tiến độ đến mốc voucher tiếp theo"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">
                Ngày thường +{weekdayPoints} · cuối tuần +{weekendPoints} điểm
              </p>
            </motion.div>
            <motion.div
              {...revealProps(reduceMotion, 0.2)}
              className="flex flex-col justify-center gap-2"
            >
              <p className="flex items-center justify-center gap-1.5 text-center text-sm font-bold text-primary">
                {!today && <CalendarCheck size={16} aria-hidden="true" />}
                <span>
                  {today
                    ? `Hôm nay +${today.points} điểm`
                    : "Đã điểm danh hôm nay"}
                </span>
              </p>
              {today && (
                <button
                  className={`btn btn-primary w-full${claim.isPending ? " pointer-events-none" : ""}`}
                  disabled={claim.isPending}
                  aria-busy={claim.isPending}
                  aria-disabled={claim.isPending}
                  onClick={quickClaim}
                >
                  {claim.isPending ? (
                    <>
                      <span
                        className="loading loading-spinner loading-sm"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Đang điểm danh</span>
                    </>
                  ) : (
                    "Điểm danh nhanh"
                  )}
                </button>
              )}
            </motion.div>
          </div>
        </div>
      </section>
      {showFloating && (
        <Link
          href="/checkin"
          aria-label="Mở lịch điểm danh"
          className="fixed bottom-24 right-4 z-30 flex min-h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-content shadow-lg sm:bottom-6 sm:right-6"
        >
          <CalendarCheck size={18} />
          <span className="hidden sm:inline">Điểm danh</span>
        </Link>
      )}
    </>
  );
}
