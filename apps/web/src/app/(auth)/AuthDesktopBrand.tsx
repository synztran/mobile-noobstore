import Image from "@/components/ui/AdaptiveImage";

export function AuthDesktopBrand() {
  return (
    <aside className="relative hidden min-h-[34rem] flex-col justify-between overflow-hidden rounded-[2rem] bg-surface-container-low p-10 lg:flex">
      <div className="relative h-24 w-40">
        <Image
          src="/logo/noob-store.png"
          alt="NoobStore"
          objectFit="contain"
          fill
          sizes="160px"
        />
      </div>
      <div className="relative z-10 max-w-md pb-4">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-primary">
          NoobStore · Build your setup
        </p>
        <h2 className="text-4xl font-black leading-tight tracking-tight text-on-surface xl:text-5xl">
          Góc quen của những người mê phím cơ.
        </h2>
        <p className="mt-5 max-w-sm text-base leading-relaxed text-on-surface-variant">
          Khám phá bàn phím, keycap và switch — rồi hoàn thiện góc setup theo chất riêng của bạn.
        </p>
      </div>
      <div aria-hidden="true" className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
    </aside>
  );
}
