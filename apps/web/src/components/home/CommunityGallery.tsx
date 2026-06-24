"use client";

import type { CommunityPhoto } from "@/app/api/home/community-gallery/route";
import { useHomeCommunityGallery } from "@/lib/react-query/home/api/useHomeQueries";
import { Heart } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

const PAGE_SIZE = 5;

export function CommunityGallery() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { data, isLoading } = useHomeCommunityGallery(limit);

  if (isLoading) {
    return (
      <section className="px-6">
        <div className="mb-8 h-8 animate-pulse rounded-lg bg-surface-container" />
        <div className="grid grid-cols-2 gap-2">
          <div className="aspect-square animate-pulse rounded-lg bg-surface-container" />
          <div className="row-span-2 animate-pulse rounded-lg bg-surface-container" />
          <div className="aspect-square animate-pulse rounded-lg bg-surface-container" />
        </div>
      </section>
    );
  }

  if (data?.photos?.length === 0) {
    return null;
  }

  return (
    <section className="px-6">
      <div className="mb-8">
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

      {/* Masonry: 2 columns, images render at their natural aspect ratio */}
      <div className="columns-2 gap-2 space-y-2">
        {data?.photos?.map((photo, i) => (
          <div
            key={photo.id}
            className="group relative cursor-pointer break-inside-avoid overflow-hidden rounded-lg bg-surface-container-high animate-[fadeIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: `${i * 80}ms`, opacity: 0 }}
          >
            <Image
              src={photo.image_url}
              alt={photo.alt_text}
              width={0}
              height={0}
              sizes="(max-width: 640px) 50vw, 33vw"
              className="h-auto w-full transition-transform duration-300 group-hover:scale-105"
            />
            {/* Author overlay */}
            <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-white/20 px-2 py-1 backdrop-blur-sm transition-transform duration-300">
              {photo.author && (
                <p className="leading-1 flex items-center truncate text-[9px] font-black text-white drop-shadow">
                  @{photo.author}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {data?.hasMore && (
        <button
          onClick={() => setLimit((l) => l + PAGE_SIZE)}
          disabled={isLoading}
          className="mt-4 w-full rounded-xl border border-primary/30 py-2.5 text-xs font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/5 active:scale-95 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="loading loading-spinner text-accent"></span>
          ) : (
            "Xem thêm"
          )}
        </button>
      )}

      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-2 py-4 text-center">
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
