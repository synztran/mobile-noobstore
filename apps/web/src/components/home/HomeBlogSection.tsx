import Image from "@/components/ui/AdaptiveImage";
import { getPublicClient } from "@/lib/supabase/public";
import { ArrowRight, CalendarDays, FileText } from "lucide-react";
import Link from "next/link";

type HomePost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string;
  thumbnail: string | null;
  published_at: string | null;
  created_at: string | null;
};

async function getLatestPosts(limit: number): Promise<HomePost[]> {
  const supabase = getPublicClient();
  const { data } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, category, thumbnail, published_at, created_at"
    )
    .eq("published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as HomePost[];
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export async function HomeBlogSection() {
  const posts = await getLatestPosts(3);

  if (posts.length === 0) return null;

  return (
    <section className="px-6 lg:px-0">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-black uppercase tracking-tight text-on-surface lg:text-2xl">
          Chia sẻ
        </h2>
        <Link
          href="/blogs"
          className="group flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-primary transition-all hover:gap-2"
        >
          Xem tất cả
          <ArrowRight size={10} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {posts.map((post) => {
          const published = formatDate(post.published_at ?? post.created_at);
          return (
            <Link
              key={post.id}
              href={`/blogs/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-low transition-all hover:shadow-float active:scale-[0.99]"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-container">
                {post.thumbnail ? (
                  <Image
                    src={post.thumbnail}
                    alt={post.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <FileText
                      size={40}
                      strokeWidth={1}
                      className="text-outline-variant/50"
                      aria-hidden="true"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <span className="inline-flex w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {post.category}
                </span>
                <p className="line-clamp-2 text-sm font-black leading-snug text-on-surface transition-colors group-hover:text-primary">
                  {post.title}
                </p>
                {post.excerpt && (
                  <p className="line-clamp-2 text-xs font-medium leading-relaxed text-on-surface-variant">
                    {post.excerpt}
                  </p>
                )}
                {published && (
                  <p className="mt-auto flex items-center gap-1.5 pt-2 text-[10px] font-semibold text-outline">
                    <CalendarDays size={12} aria-hidden="true" />
                    {published}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
