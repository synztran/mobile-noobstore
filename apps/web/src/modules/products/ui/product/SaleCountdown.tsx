"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  endsAt: string;
}

function getRemaining(endsAt: string): number {
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SaleCountdown({ endsAt }: Props) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    setRemaining(getRemaining(endsAt));
    const timer = setInterval(() => {
      setRemaining(getRemaining(endsAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (remaining <= 0) return null;

  const isUrgent = remaining < 3_600_000;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        ...(isUrgent ? { scale: [1, 1.04, 1] } : {}),
      }}
      transition={{
        ...(isUrgent
          ? { repeat: Infinity, duration: 2, ease: "easeInOut" }
          : { duration: 0.3, ease: "easeOut" }),
      }}
      className="flex items-center gap-1.5 rounded-md bg-red-500 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg"
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
      </svg>
      {formatTime(remaining)}
    </motion.div>
  );
}
