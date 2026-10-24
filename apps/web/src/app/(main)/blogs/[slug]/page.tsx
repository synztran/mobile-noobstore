import { notFound } from "next/navigation";
import { CalendarDays, User } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { buildOg, toPlainText } from "@/lib/og";

type BlogPost = {
	id: string;
	slug: string;
	title: string;
	content: string;
	excerpt: string | null;
	category: string;
	author: string;
	thumbnail: string | null;
	meta_title: string | null;
	meta_description: string | null;
	published_at: string | null;
	created_at: string | null;
};

async function getPost(slug: string): Promise<BlogPost | null> {
	const supabase = await createClient();
	const { data } = await supabase
		.from("blog_posts")
		.select("*")
		.eq("slug", slug)
		.eq("published", true)
		.single();

	return data as BlogPost | null;
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const url = `/blogs/${slug}`;
	const post = await getPost(slug);

	// Always return a full card. A bare `{ title }` drops the whole openGraph
	// object, leaving no og:url and no image for Facebook.
	if (!post) {
		return buildOg({
			title: "Bài viết không tìm thấy",
			description: "Bài viết không tìm thấy trên NoobStore.",
			url,
		});
	}

	return buildOg({
		title: post.meta_title || post.title,
		description:
			post.meta_description || toPlainText(post.excerpt || post.content),
		url,
		image: post.thumbnail,
		imageAlt: post.title,
		type: "article",
	});
}

export default async function BlogDetailPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const post = await getPost(slug);

	if (!post) notFound();

	return (
		<main className="mx-auto max-w-3xl px-4 py-8 pb-28">
			<Link
				href="/blogs"
				className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:text-primary/80"
			>
				&larr; Quay lại Blog
			</Link>

			<article>
				<div className="mb-6">
					<span className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
						{post.category}
					</span>
					<p className="mt-3 text-2xl font-black leading-tight tracking-tight text-on-surface">
						{post.title}
					</p>
					<div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-on-surface-variant/70">
						<div className="flex items-center gap-1.5">
							<CalendarDays size={14} />
							{post.published_at
								? new Date(post.published_at).toLocaleDateString("vi-VN")
								: post.created_at
									? new Date(post.created_at).toLocaleDateString("vi-VN")
									: ""}
						</div>
						<div className="flex items-center gap-1.5">
							<User size={14} />
							{post.author}
						</div>
					</div>
				</div>

				<div
					className="content-html text-sm font-medium leading-relaxed text-on-surface-variant"
					dangerouslySetInnerHTML={{ __html: safeHtml(post.content) }}
				/>
			</article>
		</main>
	);
}
import { safeHtml } from "@/lib/safe-html";
