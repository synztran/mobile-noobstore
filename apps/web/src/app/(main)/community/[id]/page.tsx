import { PostTypeBadge, RankChip } from "@/components/community/Badges";
import { CreatePostDrawer } from "@/components/community/CreatePostDrawer";
import { PostMedia } from "@/components/community/PostMedia";
import { getPostDetail } from "@/lib/community-server";
import { createClient } from "@/lib/supabase/server";
import { CalendarDays, Eye, User } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { buildOg, toPlainText } from "@/lib/og";

interface Params {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const url = `/community/${id}`;
  const post = await getPostDetail(id);

  // Always a full card — a bare `{ title }` emits no og:url and no image.
  if (!post) {
    return buildOg({
      title: "Bài viết không tìm thấy",
      description: "Bài viết không tìm thấy trên NoobStore.",
      url,
    });
  }

  return buildOg({
    title: post.title,
    description: toPlainText(post.content),
    url,
    image: post.media[0]?.url,
    imageAlt: post.title,
    type: "article",
  });
}

export default async function PostDetailPage({ params }: Params) {
  const { id } = await params;
  const post = await getPostDetail(id);
  if (!post) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-28">
      <Link
        href="/community"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:text-primary/80"
      >
        &larr; Quay lại cộng đồng
      </Link>

      <article>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <PostTypeBadge type={post.post_type} />
          {post.author_rank_name && (
            <RankChip
              rankName={post.author_rank_name}
              color={post.author_rank_color}
            />
          )}
        </div>

        <h1 className="text-2xl font-black leading-tight tracking-tight text-on-surface">
          {post.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-on-surface-variant/70">
          <span className="flex items-center gap-1.5">
            <User size={14} />
            {post.author_name}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} />
            {new Date(post.published_at ?? post.created_at).toLocaleDateString("vi-VN")}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye size={14} />
            {post.view_count} lượt xem
          </span>
        </div>

        {post.media.length > 0 && (
          <div className="mt-5 grid gap-3">
            {post.media.map((media, i) =>
              media.kind === "video" ? (
                <video
                  key={i}
                  src={media.url}
                  controls
                  preload="metadata"
                  playsInline
                  className="w-full rounded-2xl bg-black"
                />
              ) : (
                <div
                  key={i}
                  className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-surface-container"
                >
                  <PostMedia
                    media={media}
                    className="object-cover"
                    priority={i === 0}
                    sizes="(max-width: 768px) 100vw, 672px"
                  />
                </div>
              ),
            )}
          </div>
        )}

        {post.content && (
          <div className="mt-6 whitespace-pre-wrap text-sm font-medium leading-relaxed text-on-surface-variant">
            {post.content}
          </div>
        )}
      </article>

      {!user && (
        <div className="mt-8 flex items-center justify-between gap-3 rounded-2xl bg-surface-container-low p-4">
          <p className="text-xs font-semibold text-on-surface-variant">
            Muốn chia sẻ build của chính bạn?
          </p>
          <CreatePostDrawer
            triggerClassName="btn btn-primary btn-sm rounded-full text-xs font-bold text-white"
            triggerChildren="Đăng bài"
          />
        </div>
      )}
    </main>
  );
}