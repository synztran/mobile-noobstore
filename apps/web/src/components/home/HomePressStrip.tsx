"use client";

const BRANDS: {
  name: string;
  initials: string;
  bg: string;
  fg: string;
}[] = [
  { name: "Gearvn", initials: "GV", bg: "#2563eb", fg: "#ffffff" },
  { name: "Mechanic", initials: "MC", bg: "#7c3aed", fg: "#ffffff" },
  { name: "ThinkPro", initials: "TP", bg: "#0891b2", fg: "#ffffff" },
  { name: "CellphoneS", initials: "CS", bg: "#d97706", fg: "#ffffff" },
  { name: "Vietgear", initials: "VG", bg: "#dc2626", fg: "#ffffff" },
];

function BrandLogo({
  brand,
  className,
}: {
  brand: (typeof BRANDS)[number];
  className?: string;
}) {
  return (
    <svg viewBox="0 0 120 40" className={className}>
      <rect width="120" height="40" rx="8" fill={brand.bg} />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="900"
        fontSize="16"
        fill={brand.fg}
        letterSpacing="2"
      >
        {brand.initials}
      </text>
    </svg>
  );
}

export function HomePressStrip() {
  return (
    <section className="overflow-hidden px-6">
      <p className="mb-4 text-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
        Đã được giới thiệu bởi
      </p>
      <div className="relative">
        <style>{`
          @keyframes press-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
        <div
          className="flex w-max items-center gap-12 opacity-60"
          style={{
            animation: "press-scroll 20s linear infinite",
          }}
        >
          {[...BRANDS, ...BRANDS].map((brand, i) => (
            <BrandLogo
              key={i}
              brand={brand}
              className="h-10 w-[100px] flex-shrink-0"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
