import { motion } from "framer-motion";

type PreOrderConfig = {
  estimate: string;
  available_date?: string | null;
  notes?: string | null;
};

type PreOrderBannerProps = {
  config: PreOrderConfig;
};

export function PreOrderBanner({ config }: PreOrderBannerProps) {
  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4">
      <div className="mb-3 flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 shrink-0 text-violet-500"
          fill="currentColor"
        >
          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
        </svg>
        <p className="text-xs font-black uppercase tracking-widest text-violet-500">
          Sản phẩm đặt trước
        </p>
      </div>

      {/* Timeline */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
        }}
        className="ml-1.5 space-y-0"
      >
        {[
          {
            dot: "bg-violet-400",
            line: true,
            title: "Đặt trước",
            subtitle: "Đặt cọc ngay hôm nay",
          },
          {
            dot: "bg-violet-400",
            line: true,
            title: `Giao hàng: ${config.estimate}`,
            subtitle: config.available_date
              ? `Dự kiến có hàng: ${config.available_date}`
              : null,
          },
          {
            dot: "border-2 border-violet-300 bg-white",
            line: false,
            title: "Giao đến bạn",
            subtitle: config.notes ?? null,
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, x: -12 },
              visible: { opacity: 1, x: 0 },
            }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex gap-3"
          >
            <div className="flex flex-col items-center">
              <div className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
              {item.line && <div className="h-8 w-px bg-violet-200" />}
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface">{item.title}</p>
              {item.subtitle && (
                <p className="text-[10px] text-on-surface-variant">
                  {item.subtitle}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
