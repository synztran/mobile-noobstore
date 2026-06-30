import { motion } from "framer-motion";

type PreOrderConfig = {
  estimate: string;
  available_date?: string | null;
  notes?: string | null;
};

type PreOrderBannerProps = {
  config: PreOrderConfig;
};

const todayLabel = new Date().toLocaleDateString("vi-VN", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

const liner = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0 },
};

export function PreOrderBanner({ config }: PreOrderBannerProps) {
  const hasExtra = config.available_date || config.notes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4 rounded-2xl border border-violet-500/25 bg-gradient-to-b from-violet-500/[0.08] to-violet-500/[0.04] p-4"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/15">
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 text-violet-500"
            fill="currentColor"
          >
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
          </svg>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
          Sản phẩm Pre-order
        </p>
      </div>

      {/* ── Info section ── */}
      <div className="space-y-3 rounded-xl bg-violet-500/[0.06] px-2 py-2">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="currentColor"
            >
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-black tracking-[0.12em] text-violet-500/70">
              Dự kiến giao hàng
            </p>
            <p className="mt-0.5 text-xs font-bold text-on-surface">
              {config.estimate || "Chưa cập nhật"}
            </p>
          </div>
        </div>

        {config.available_date && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="currentColor"
              >
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-[0.12em] text-violet-500/70">
                Ngày có hàng
              </p>
              <p className="mt-0.5 text-sm font-bold text-on-surface">
                {config.available_date}
              </p>
            </div>
          </div>
        )}

        {config.notes && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="currentColor"
              >
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-violet-500/70">
                Ghi chú
              </p>
              <p className="mt-0.5 text-xs font-bold text-on-surface">
                {config.notes}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Timeline ── */}
      {hasExtra && <div className="border-t border-violet-500/10" />}

      <div>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: { staggerChildren: 0.25, delayChildren: 0.1 },
            },
          }}
          className="flex items-center"
        >
          {/* Point 1 — Today */}
          <motion.div
            variants={liner}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 0 3px rgba(139,92,246,0.25)",
                  "0 0 0 8px rgba(139,92,246,0.1)",
                  "0 0 0 3px rgba(139,92,246,0.25)",
                ],
              }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="h-3 w-3 rounded-full bg-violet-500"
            />
            <p className="mt-2 text-[10px] font-bold text-on-surface">
              Hôm nay
            </p>
            <p className="text-[9px] text-on-surface-variant">{todayLabel}</p>
          </motion.div>

          {/* Dashed connector */}
          <motion.div
            variants={liner}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mx-2 flex-1"
          >
            <div className="mb-0.5 text-center text-xs font-semibold text-violet-500">
              {config.estimate}
            </div>
            <div className="h-px w-full border-b border-dashed border-violet-300/60" />
          </motion.div>

          {/* Point 2 — Estimate */}
          <motion.div
            variants={liner}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <div className="h-3 w-3 rounded-full border-2 border-violet-400 bg-white" />
            <p className="mt-2 text-right text-[10px] font-bold text-on-surface">
              Giao hàng
            </p>
            <p className="text-right text-[9px] text-violet-600">
              {config.available_date || "Chưa cập nhật"}
            </p>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
