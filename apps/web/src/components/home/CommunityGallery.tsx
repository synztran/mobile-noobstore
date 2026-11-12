"use client";

import type { CommunityPhoto } from "@/app/api/home/community-gallery/route";
import { useHomeCommunityGallery } from "@/lib/react-query/home/api/useHomeQueries";
import { Heart } from "lucide-react";
import Image from "@/components/ui/AdaptiveImage";
import { useEffect, useRef, useState } from "react";

const PAGE_SIZE = 10;

type ImageMeta = Record<string, { id: string; ratio: number; loaded: boolean }>;

function useIntersectionVisible(ref: React.RefObject<Element | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

export function CommunityGallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const visible = useIntersectionVisible(sectionRef);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading, isFetching } = useHomeCommunityGallery(limit);
  const [imageMeta, setImageMeta] = useState<ImageMeta>({});

  const photos = data?.photos ?? [];
  const hasMore = data?.hasMore ?? false;

  const handleLoadingComplete = (id: string) => () => {
    setImageMeta((prev) => ({
      ...prev,
      [id]: { id, ratio: 1, loaded: true },
    }));
  };

  if (isLoading) {
    return (
      <section ref={sectionRef} className="px-4 lg:px-0">
        <div className="mb-8">
          <div className="mb-2 h-4 w-24 animate-pulse rounded bg-surface-container" />
          <div className="h-8 w-3/4 max-w-sm animate-pulse rounded-lg bg-surface-container" />
          <div className="mt-2 h-4 w-2/3 max-w-xs animate-pulse rounded bg-surface-container" />
        </div>
        <div className="columns-2 gap-2 space-y-2 md:columns-3 lg:columns-4">
          {Array.from({ length: PAGE_SIZE }, (_, index) => (
            <div
              key={index}
              className={`break-inside-avoid animate-pulse overflow-hidden rounded-xl bg-surface-container-high ${
                index % 4 === 1 ? "aspect-[3/4]" : "aspect-square"
              }`}
            />
          ))}
        </div>
        <div className="mt-6 h-12 animate-pulse rounded-xl bg-surface-container" />
        <div className="mt-6 space-y-2 rounded-xl border border-primary/10 bg-primary/5 px-3 py-4">
          <div className="mx-auto h-3 w-3/4 animate-pulse rounded bg-surface-container" />
          <div className="mx-auto h-3 w-2/3 animate-pulse rounded bg-surface-container" />
        </div>
      </section>
    );
  }

  if (photos.length === 0) return null;

  return (
    <section ref={sectionRef} className="px-6 lg:px-0">
      <div
        className={`mb-8 transition-all duration-700 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <Heart size={20} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Cộng đồng
          </span>
        </div>
        <p className="text-2xl font-black uppercase tracking-wide">
          Phím đẹp từ cộng đồng
        </p>
        <p className="text-xs text-on-surface-variant">
          Khám phá những setup độc đáo từ cộng đồng
        </p>
      </div>

      <div className="columns-2 gap-2 space-y-2 lg:columns-4">
        {photos.map((photo) => {
          const meta = imageMeta[photo.id];
          const isLoaded = meta?.loaded ?? false;

          return (
            <div
              key={photo.id}
              className="group relative cursor-pointer break-inside-avoid overflow-hidden rounded-xl bg-surface-container-high"
            >
              <div className="relative overflow-hidden">
                <Image
                  src={photo.image_url}
                  alt={photo.alt_text}
                  width={0}
                  height={0}
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className={`h-auto w-full transition-all duration-700 ${
                    isLoaded ? "scale-100 blur-0" : "scale-105 blur-xl"
                  } group-hover:scale-105`}
                  onLoadingComplete={handleLoadingComplete(photo.id)}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </div>

              <div
                className={`absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-black/50 to-transparent px-3 py-2 backdrop-blur-sm transition-all duration-300 ${
                  isLoaded
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2 opacity-0"
                }`}
              >
                <div className="flex items-center justify-between">
                  {photo.author && (
                    <p className="truncate text-[9px] font-black text-white drop-shadow">
                      @{photo.author}
                    </p>
                  )}
                  <Heart
                    size={12}
                    className="shrink-0 text-white/70 transition-colors hover:text-red-400"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
          disabled={isFetching}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 py-3 text-xs font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/5 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFetching && (
            <span className="loading loading-spinner loading-xs" />
          )}
          {isFetching ? "Đang tải..." : "Xem thêm"}
        </button>
      )}

      <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 px-2 py-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          ✨ Tag @noobstore, để sớm được chia sẻ ✨
        </p>
        <p className="mt-1 text-xs text-on-surface-variant">
          Hãy chia sẻ setup của bạn trên mạng xã hội
        </p>
      </div>
    </section>
  );
}
