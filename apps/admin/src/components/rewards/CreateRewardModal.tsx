"use client";

import { useState } from "react";
import RewardFormModal from "./RewardFormModal";

export default function CreateRewardModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        + Tạo phần thưởng
      </button>
      <RewardFormModal
        open={open}
        onClose={() => setOpen(false)}
        mode="create"
      />
    </>
  );
}
