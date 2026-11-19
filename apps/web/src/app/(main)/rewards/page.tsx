"use client";

import { withAuthRedirect } from "@/modules/user/ui/withAuthRedirect";
import { PointsBalanceCard } from "@/components/rewards/PointsBalanceCard";
import { ClaimsHistory } from "@/components/rewards/ClaimsHistory";
import { RewardsGrid } from "@/components/rewards/RewardsGrid";
import { ConfirmRedemptionModal } from "@/components/rewards/ConfirmRedemptionModal";
import { SuccessModal } from "@/components/rewards/SuccessModal";
import { usePointsBalance } from "@/lib/react-query/points/api/usePointsQueries";
import { useCheckinCalendar } from "@/modules/checkin/client/queries";
import { useAuth } from "@/modules/user/client/AuthProvider";
import {
  useClaims,
  useRedeemReward,
} from "@/lib/react-query/rewards/api/useRewardsMutations";
import type { RewardItem, RedeemResponse } from "@/types/reward";
import { ArrowLeft, ArrowRight, Sparkles, Ticket } from "lucide-react";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { useState } from "react";

function RewardsPage() {
  const { data: balance = 0, isLoading: isBalanceLoading } = usePointsBalance();
  const checkinMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const { data: checkinData } = useCheckinCalendar(checkinMonth);
  const { refreshProfile } = useAuth();

  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [redeemResult, setRedeemResult] = useState<RedeemResponse | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: claimsData, isLoading: claimsLoading } = useClaims();
  const redeemMutation = useRedeemReward();

  const handleRedeem = (rewardItemId: string) => {
    redeemMutation.mutate(rewardItemId, {
      onSuccess: (result) => {
        setRedeemResult(result);
        setSelectedReward(null);
        setShowSuccess(true);
        void refreshProfile();
      },
      onError: (err: Error) => {
        toast.error(err.message);
      },
    });
  };

  const claims = claimsData?.claims ?? [];

  return (
    <div className="space-y-4 px-4 pb-6 pt-2 lg:grid lg:grid-cols-12 lg:gap-y-8 lg:space-y-0 lg:pt-4">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3 lg:hidden">
        <Link
          href="/profile"
          aria-label="Quay lại"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container transition-transform active:scale-90"
        >
          <ArrowLeft size={18} className="text-on-surface" />
        </Link>
        <p className="text-xl font-black tracking-tight text-on-surface">
          Đổi thưởng
        </p>
      </div>

      <div className="space-y-4 lg:col-span-12 lg:space-y-0">
        {/* Points Balance Card */}
        <PointsBalanceCard
          isLoading={isBalanceLoading}
          balance={balance}
          dailyCheckinBalance={checkinData?.availablePoints}
          dailyCheckinEarliestExpiry={checkinData?.earliestExpiry}
          claimsCount={claims.length}
          showHistory={showHistory}
          onToggleHistory={() => setShowHistory(!showHistory)}
        />

        {/* Info notice stays mobile-only; mockup places earn/redeem guidance in the catalog heading. */}
        <div className="flex items-start gap-3 rounded-2xl bg-primary-fixed/20 px-4 py-3 lg:hidden">
          <Sparkles size={16} className="mt-0.5 flex-shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-on-surface-variant">
            Dùng điểm NSP hoặc điểm chuyên cần để đổi voucher ưu đãi và quà.
            Điểm đã đổi sẽ không được hoàn lại.
          </p>
        </div>

        {/* Gift Card Link */}
        <Link
          href="/rewards/gift-card"
          className="flex items-center gap-2 rounded-2xl bg-surface-container-lowest p-4 shadow-ambient-sm transition-transform active:scale-[0.98] lg:hidden"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/20 text-primary">
            <Ticket size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-on-surface">
              Nạp thẻ quà tặng
            </p>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              Nhập mã thẻ để nhận điểm NSP
            </p>
          </div>
          <ArrowRight size={16} className="flex-shrink-0 text-outline" />
        </Link>
      </div>

      {/* Desktop catalog leads; vertical history supports. Mobile keeps its existing toggle and sequence. */}
      <div className="mt-4 lg:col-span-12 lg:mt-0 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-4 lg:gap-y-4">
        <section className="min-w-0 lg:col-span-8">
          <RewardsGrid
            balance={balance}
            dailyCheckinBalance={checkinData?.availablePoints ?? 0}
            onRedeem={(r) => setSelectedReward(r)}
          />
        </section>
        <aside className="hidden min-w-0 lg:col-span-4 lg:block">
          <ClaimsHistory
            claims={claims}
            isLoading={claimsLoading}
            variant="desktop"
          />
        </aside>
        {showHistory && (
          <section className="mt-4 lg:hidden">
            <ClaimsHistory claims={claims} isLoading={claimsLoading} />
          </section>
        )}
      </div>

      {/* Confirm Redemption Modal */}
      <ConfirmRedemptionModal
        reward={selectedReward}
        isPending={redeemMutation.isPending}
        balance={balance}
        dailyCheckinBalance={checkinData?.availablePoints ?? 0}
        onClose={() => setSelectedReward(null)}
        onConfirm={handleRedeem}
      />

      {/* Success Modal */}
      <SuccessModal
        result={redeemResult}
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}

export default withAuthRedirect(RewardsPage);
