"use client";

import type { CustomerRank } from "@/types/rank";
import Image from "next/image";

interface Props {
  rank: CustomerRank;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}

export function RankBadge({
  rank,
  size = "md",
  className = "",
  onClick,
}: Props) {
  const sizeClasses = {
    sm: "h-6 min-w-6 text-[8px]",
    md: "h-10 min-w-10 text-[10px]",
    lg: "h-12 min-w-12 text-xs",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-shrink-0 items-center justify-center rounded-full font-black text-white transition-transform active:scale-90 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: rank.color }}
      title={rank.name}
    >
      {rank.iconUrl ? (
        <Image
          src={rank.iconUrl}
          alt={rank.name}
          className="h-full w-full rounded-full object-cover"
          fill
          sizes="48px"
        />
      ) : (
        (rank.iconLabel ?? rank.name.charAt(0))
      )}
    </button>
  );
}
