"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import RewardFormModal from "./RewardFormModal";

type Props = {
  reward: {
    id: string;
    name: string;
    description: string | null;
    reward_type: string;
    points_cost: number;
    stock: number | null;
    claimed_count: number;
    is_active: boolean;
    image_url: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  };
};

export default function UpdateRewardModal({ reward }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
      >
        <Pencil className="h-3.5 w-3.5" />
        Sửa
      </button>
      <RewardFormModal
        open={open}
        onClose={() => setOpen(false)}
        mode="update"
        reward={reward}
      />
    </>
  );
}
