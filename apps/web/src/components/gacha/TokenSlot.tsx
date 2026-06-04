"use client";

import { TOKEN_ICON } from "@/lib/images";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { memo } from "react";

interface TokenSlotProps {
  hasToken: boolean;
}

export const TokenSlot = memo(function TokenSlot({ hasToken }: TokenSlotProps) {
  return (
    <div className="relative flex flex-col items-center gap-2">
      {/* Metallic outer frame */}
      <div
        className="relative flex h-20 w-[76px] items-center justify-center border-2 border-[#888]"
        style={{
          background:
            "linear-gradient(145deg, #c8c8c8 0%, #a0a0a0 50%, #909090 100%)",
          borderRadius: "38px 38px 12px 12px",
          boxShadow:
            "0 6px 16px rgba(0,0,0,0.32), inset 0 2px 4px rgba(255,255,255,0.55), inset 0 -2px 4px rgba(0,0,0,0.15)",
        }}
      >
        {/* Inner slot body */}
        <div
          className="relative flex h-[68px] w-[62px] flex-col items-center overflow-hidden border-2 border-[#2a2a3e]"
          style={{
            background: "linear-gradient(180deg, #1a1a2e 0%, #0c0c1a 100%)",
            borderRadius: "31px 31px 8px 8px",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)",
          }}
        >
          {/* Top gloss arc */}
          <div
            className="absolute left-4 right-4 top-1.5 h-[5px] rounded blur-[1px]"
            style={{ background: "rgba(255,255,255,0.10)" }}
          />

          {/* Slot opening slit frame */}
          <div className="absolute left-1/2 top-4 h-[14px] w-[46px] -translate-x-1/2 rounded border-2 border-[#333] bg-transparent" />

          {/* Slot slit glow */}
          <div
            className="absolute left-1/2 top-5 h-1.5 w-9 -translate-x-1/2 rounded-sm"
            style={{
              background: hasToken ? "#22c55e" : "#040408",
              boxShadow: hasToken
                ? "0 0 12px #22c55e, 0 0 24px #22c55e66"
                : "inset 0 1px 3px rgba(0,0,0,0.9)",
              transition: "background 0.3s ease, box-shadow 0.3s ease",
            }}
          />

          {/* Coin animation */}
          <AnimatePresence>
            {hasToken && (
              <motion.div
                className="absolute left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-amber-800"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 55%, #b45309)",
                  boxShadow:
                    "0 3px 8px rgba(0,0,0,0.45), inset 0 1px 3px rgba(255,255,255,0.35)",
                }}
                initial={{
                  y: -44,
                  opacity: 0,
                  scale: 0.5,
                  rotate: -45,
                }}
                animate={{
                  y: 36,
                  opacity: 1,
                  scale: 1,
                  rotate: 0,
                }}
                exit={{ y: 90, opacity: 0, scale: 0.3 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 16,
                  delay: 0.05,
                }}
              >
                {/* Coin glint */}
                <div
                  className="absolute rounded-full bg-white/50"
                  style={{
                    width: "28%",
                    height: "18%",
                    top: "16%",
                    left: "18%",
                  }}
                />
                {/* Coin icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <Image
                    src={TOKEN_ICON}
                    alt=""
                    width={22}
                    height={22}
                    objectFit="contain"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ready-state pulsing ring */}
          {!hasToken && (
            <motion.div
              className="absolute left-[10%] top-4 h-[14px] w-[46px] -translate-x-1/2 rounded"
              style={{
                border: "1.5px solid rgba(245,158,11,0.3)",
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
          )}

          {/* Bottom label */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center text-[6px] font-bold tracking-[0.22em] text-gray-200">
            1 TOKEN
          </div>
        </div>
      </div>

      {/* <p
				className="text-[8px] font-black uppercase tracking-widest text-center absolute -bottom-5 left-1/2 -translate-x-1/2 w-full min-w-[120px]"
				style={{ color: hasToken ? "#22c55e" : "#888" }}>
				{hasToken ? "Token sẵn sàng!" : "Chưa có token"}
			</p> */}
    </div>
  );
});
