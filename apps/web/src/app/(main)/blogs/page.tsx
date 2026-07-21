import { CalendarDays } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog - NoobStore",
  description:
    "Tin tức, bài viết và hướng dẫn về bàn phím cơ, switch, keycap từ NoobStore.",
  openGraph: {
    title: "Blog - NoobStore",
    description:
      "Tin tức, bài viết và hướng dẫn về bàn phím cơ, switch, keycap từ NoobStore.",
    siteName: "NoobStore",
  },
};

type BlogPost = {
	id: string;
	slug: string;
	title: string;
	excerpt: string | null;
	category: string;
	author: string;
	thumbnail: string | null;
	published_at: string | null;
	created_at: string | null;
};

async function getPosts(): Promise<BlogPost[]> {
	const supabase = await createClient();
	const { data } = await supabase
		.from("blog_posts")
		.select("id, slug, title, excerpt, category, author, thumbnail, published_at, created_at")
		.eq("published", true)
		.order("published_at", { ascending: false })
		.order("created_at", { ascending: false })
		.limit(20);

	return (data ?? []) as BlogPost[];
}

function PostCard({ post }: { post: BlogPost }) {
	return (
		<Link
			href={`/blogs/${post.slug}`}
			className="group block rounded-2xl border border-outline-variant/20 bg-surface-container-low transition-all hover:shadow-float active:scale-[0.99]"
		>
			<div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-2xl bg-surface-container">
				{post.thumbnail ? (
					<Image
						src={post.thumbnail}
						alt={post.title}
						fill
						className="object-cover transition-transform duration-300 group-hover:scale-105"
						sizes="(max-width: 640px) 100vw, 50vw"
					/>
				) : (
					<div className="flex h-full items-center justify-center">
						<svg
							className="h-16 w-16 text-outline-variant/40"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={1}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
							/>
						</svg>
					</div>
				)}
			</div>
			<div className="space-y-2 p-4">
				<span className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
					{post.category}
				</span>
				<p className="line-clamp-2 text-sm font-black leading-snug text-on-surface transition-colors group-hover:text-primary">
					{post.title}
				</p>
				<p className="line-clamp-2 text-xs font-medium text-on-surface-variant">
					{post.excerpt}
				</p>
				<div className="flex items-center gap-3 pt-1">
					<div className="flex items-center gap-1 text-[11px] font-semibold text-on-surface-variant/70">
						<CalendarDays size={12} />
						{post.published_at
							? new Date(post.published_at).toLocaleDateString("vi-VN")
							: post.created_at
								? new Date(post.created_at).toLocaleDateString("vi-VN")
								: ""}
					</div>
				</div>
			</div>
		</Link>
	);
}

export default async function BlogPage() {
	const posts = await getPosts();

	return (
		<main className="mx-auto max-w-4xl px-4 py-8 pb-28">
			<div className="mb-8 text-center">
				<p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
					NoobStore Blog
				</p>
				<p className="text-2xl font-black tracking-tight text-on-surface">
					Tin tức & Hướng dẫn
				</p>
				<p className="mx-auto mt-2 max-w-md text-sm font-medium text-on-surface-variant">
					Cập nhật những bài viết mới nhất về bàn phím cơ, switch, phụ kiện và
					mẹo hay từ NoobStore.
				</p>
			</div>

			<div className="grid gap-5 sm:grid-cols-2">
				{posts.map((post) => (
					<PostCard key={post.id} post={post} />
				))}
			</div>
		</main>
	);
}
