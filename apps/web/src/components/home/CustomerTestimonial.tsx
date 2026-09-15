"use client";

import type { Creator } from "@/app/api/home/creators/route";
import { useHomeCreators } from "@/lib/react-query/home/api/useHomeQueries";
import { Sparkles } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";

const COLOR_CLASSES: Record<string, string> = {
  "bg-primary-container": "from-primary/20 to-primary/5",
  "bg-secondary-container": "from-secondary/20 to-secondary/5",
  "bg-tertiary-container": "from-tertiary/20 to-tertiary/5",
  "bg-error-container": "from-error/20 to-error/5",
};

export function CustomerTestimonial() {
  const { data: creators = [], isLoading } = useHomeCreators();

  if (isLoading) {
    return (
      <section className="px-6 pb-24">
        <div className="animate-pulse space-y-6 rounded-3xl bg-surface-container-low p-8">
          <div className="h-8 w-1/2 rounded-lg bg-surface-container" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-surface-container" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-surface-container" />
                <div className="h-3 w-1/2 rounded bg-surface-container" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (creators.length === 0) {
    return null;
  }

  return (
    <section className="px-4 lg:px-0">
      <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-container-low to-surface-container p-4 lg:p-8">
        {/* Animated background */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/5 blur-3xl transition-colors group-hover:bg-primary/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-secondary/5 blur-3xl transition-colors group-hover:bg-secondary/10" />

        <div className="relative z-10">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            <p className="font-black uppercase tracking-widest text-primary">
              Về chúng tôi
            </p>
          </div>

          <div className="mb-4 text-sm font-black">
            Đã và đang xây dựng nên NoobStore
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {creators.map((creator) => (
              <a
                key={creator.id}
                href={`https://instagram.com/${creator.social_handle.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`bg-gradient-to-br ${COLOR_CLASSES[creator.color_theme] || "from-primary/20 to-primary/5"} group/card flex cursor-pointer flex-col items-center rounded-2xl px-2 py-4 text-center transition-shadow hover:shadow-lg`}
              >
                <div className="mb-3 h-14 w-14 overflow-hidden rounded-full ring-2 ring-on-surface/10 transition-all group-hover/card:ring-primary/30">
                  <Image
                    src={creator.image_url}
                    alt={creator.name}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-xs font-bold uppercase leading-tight tracking-tight">
                  {creator.name}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {creator.role}
                </p>
                {creator.bio && (
                  <p className="mt-2 line-clamp-2 text-[9px] text-on-surface-variant">
                    {creator.bio}
                  </p>
                )}
                <p className="mt-auto text-[10px] font-bold uppercase text-primary">
                  {creator.social_handle}
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
