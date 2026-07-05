"use client";

const BRANDS = [
  "Gearvn",
  "Mechanic",
  "ThinkPro",
  "CellphoneS",
  "Vietgear",
];

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
          className="flex w-max gap-16 opacity-60"
          style={{
            animation: "press-scroll 20s linear infinite",
          }}
        >
          {[...BRANDS, ...BRANDS].map((brand, i) => (
            <span
              key={i}
              className="flex-shrink-0 text-sm font-black uppercase tracking-tight text-on-surface"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
