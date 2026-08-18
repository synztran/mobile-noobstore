"use client";

import { withAuthRedirect } from "@/components/auth/withAuthRedirect";
import { PointsBalanceCard } from "@/components/rewards/PointsBalanceCard";
import { ClaimsHistory } from "@/components/rewards/ClaimsHistory";
import { RewardsGrid } from "@/components/rewards/RewardsGrid";
import { ConfirmRedemptionModal } from "@/components/rewards/ConfirmRedemptionModal";
import { SuccessModal } from "@/components/rewards/SuccessModal";
import { usePointsBalance } from "@/lib/react-query/points/api/usePointsQueries";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { RewardItem, RedeemResponse, RewardClaim } from "@/types/reward";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Sparkles, Ticket } from "lucide-react";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { useState } from "react";

function RewardsPage() {
  const { data: balance = 0, isLoading: isBalanceLoading } = usePointsBalance();
  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [redeemResult, setRedeemResult] = useState<RedeemResponse | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: claimsData, isLoading: claimsLoading } = useQuery<{
    claims: RewardClaim[];
  }>({
    queryKey: ["claims"],
    queryFn: async () => {
      const res = await fetch("/api/claims");
      if (!res.ok) return { claims: [] };
      return res.json();
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (rewardItemId: string) => {
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardItemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Đổi thưởng thất bại");
      return data as RedeemResponse;
    },
    onSuccess: (result) => {
      setRedeemResult(result);
      setSelectedReward(null);
      setShowSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["rewards", "infinite"] });
      queryClient.invalidateQueries({ queryKey: ["points"] });
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      void refreshProfile();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const claims = claimsData?.claims ?? [];

  return (
    <div className="space-y-4 px-4 pb-6 pt-2">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
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

      {/* Points Balance Card */}
      <PointsBalanceCard
        isLoading={isBalanceLoading}
        balance={balance}
        claimsCount={claims.length}
        showHistory={showHistory}
        onToggleHistory={() => setShowHistory(!showHistory)}
      />

      {/* Info notice */}
      <div className="flex items-start gap-3 rounded-2xl bg-primary-fixed/20 px-4 py-3">
        <Sparkles size={16} className="mt-0.5 flex-shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-on-surface-variant">
          Dùng điểm NSP để đổi voucher ưu đãi, nhận thêm điểm hoặc nhận quà.
          Điểm đã đổi sẽ không được hoàn lại.
        </p>
      </div>

      {/* Gift Card Link */}
      <Link
        href="/rewards/gift-card"
        className="flex items-center gap-2 rounded-2xl bg-surface-container-lowest p-4 shadow-ambient-sm transition-transform active:scale-[0.98]"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed/20 text-primary">
          <Ticket size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-on-surface">Nạp thẻ quà tặng</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Nhập mã thẻ để nhận điểm NSP
          </p>
        </div>
        <ArrowRight size={16} className="flex-shrink-0 text-outline" />
      </Link>

      {/* Claims History */}
      {showHistory && (
        <ClaimsHistory claims={claims} isLoading={claimsLoading} />
      )}

      {/* Rewards Grid */}
      <RewardsGrid balance={balance} onRedeem={(r) => setSelectedReward(r)} />

      {/* Confirm Redemption Modal */}
      <ConfirmRedemptionModal
        reward={selectedReward}
        isPending={redeemMutation.isPending}
        onClose={() => setSelectedReward(null)}
        onConfirm={(id) => redeemMutation.mutate(id)}
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
