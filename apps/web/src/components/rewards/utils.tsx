import { Coins, Gift, ShoppingBag, Truck, Percent } from "lucide-react";
import type { RewardItem } from "@/types/reward";

export function formatPoints(value: number) {
  return `${value.toLocaleString("vi-VN")} điểm`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getRewardIcon(
  rewardType: string,
  metadata: Record<string, unknown>
) {
  if (rewardType === "point") return <Coins size={20} />;
  if (rewardType === "product") return <Gift size={20} />;
  const rt = metadata.reward_type as string;
  if (rt === "free_shipping") return <Truck size={20} />;
  if (rt === "percent_off") return <Percent size={20} />;
  return <ShoppingBag size={20} />;
}

type BenefitConfig = {
  benefit: (m: Record<string, unknown>) => string;
  condition: (m: Record<string, unknown>) => string;
};

function buildVoucherCondition(m: Record<string, unknown>): string {
  const minOrder = m.min_order_amount as number;
  const parts: string[] = [];
  if (minOrder > 0) parts.push(`đơn ≥ ${minOrder.toLocaleString("vi-VN")}₫`);
  return parts.join(" • ");
}

function buildVoucherBenefit(m: Record<string, unknown>): string {
  const maxDisc = m.max_discount_amount as number | null;
  const amountOff = m.amount_off as number | null;
  const percentOff = m.percent_off as number | null;
  const parts: string[] = [];
  if (amountOff) parts.push(`Giảm ${amountOff.toLocaleString("vi-VN")}₫`);
  if (percentOff) parts.push(`Giảm ${percentOff}%`);
  if (maxDisc) parts.push(`tối đa ${maxDisc.toLocaleString("vi-VN")}₫`);
  return parts.join(" • ");
}

const voucherBenefitMap: Record<string, BenefitConfig> = {
  amount_off: {
    benefit: (m) =>
      `Giảm ${(m.amount_off as number)?.toLocaleString("vi-VN")}₫`,
    condition: (m) => buildVoucherCondition(m),
  },
  percent_off: {
    benefit: (m) => buildVoucherBenefit(m),
    condition: (m) => buildVoucherCondition(m),
  },
  free_shipping: {
    benefit: () => "Miễn phí ship",
    condition: (m) => buildVoucherCondition(m),
  },
};

const rewardBenefitMap: Record<string, BenefitConfig> = {
  point: {
    benefit: (m) => `Nhận ${(m.point_amount as number) ?? 0} điểm NSP`,
    condition: () => "",
  },
  product: {
    benefit: () => "Sản phẩm vật lý",
    condition: () => "",
  },
};

export function buildBenefit(reward: RewardItem) {
  if (reward.rewardType === "voucher") {
    const rt = reward.metadata.reward_type as string;
    const config = voucherBenefitMap[rt];
    if (config)
      return {
        benefit: config.benefit(reward.metadata),
        condition: config.condition(reward.metadata),
      };
  }
  const config = rewardBenefitMap[reward.rewardType];
  if (config)
    return {
      benefit: config.benefit(reward.metadata),
      condition: config.condition(reward.metadata),
    };
  return { benefit: "", condition: "" };
}
