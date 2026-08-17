import type { PostRow } from "@/lib/community-server";
import { Eye, User } from "lucide-react";
import Link from "next/link";
import { PostTypeBadge, RankChip } from "./Badges";
import { PostMedia } from "./PostMedia";

export function CommunityPostCard({ post }: { post: PostRow }) {
  const cover = post.media[0];

  return (
    <Link
      href={`/community/${post.id}`}
      className="group block overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low transition-all hover:shadow-float active:scale-[0.99]"
    >
      {cover && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-container">
          {cover.kind === "image" ? (
            <PostMedia
              media={cover}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          ) : (
            <PostMedia media={cover} className="h-full w-full object-cover" />
          )}
        </div>
      )}

      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <PostTypeBadge type={post.post_type} />
          {post.author_rank_name && (
            <RankChip
              rankName={post.author_rank_name}
              color={post.author_rank_color}
            />
          )}
        </div>
        <p className="line-clamp-2 text-sm font-black leading-snug text-on-surface transition-colors group-hover:text-primary">
          {post.title}
        </p>
        {post.content && (
          <p className="line-clamp-2 text-xs font-medium text-on-surface-variant">
            {post.content}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] font-semibold text-on-surface-variant/70">
          <span className="flex items-center gap-1">
            <User size={12} />
            {post.author_name}
          </span>
          <span>{new Date(post.published_at ?? post.created_at).toLocaleDateString("vi-VN")}</span>
          {post.view_count > 0 && (
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {post.view_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}