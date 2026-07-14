import { CalendarDays, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type MakerRelease = {
	id: string;
	title: string;
	content: string;
	excerpt: string | null;
	source_url: string | null;
	maker_name: string | null;
	published_at: string | null;
};

async function getReleases(): Promise<MakerRelease[]> {
	const supabase = await createClient();
	const { data } = await supabase
		.from("maker_releases")
		.select("*")
		.order("published_at", { ascending: false });

	return (data ?? []) as MakerRelease[];
}

function trimContent(html: string, max = 250): string {
	return html.replace(/<[^>]*>/g, "").trim().slice(0, max) + "...";
}

export default async function NewReleasePage() {
	const releases = await getReleases();

	return (
		<main className="mx-auto max-w-4xl px-4 py-8 pb-28">
			<div className="mb-8 text-center">
				<p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-primary">
					Cập nhật thị trường
				</p>
				<p className="text-2xl font-black tracking-tight text-on-surface">
					Tin tức mới từ các hãng
				</p>
				<p className="mx-auto mt-2 max-w-md text-sm font-medium text-on-surface-variant">
					Cập nhật những thông tin mới nhất về groupbuy, sản phẩm mới và bản
					cập nhật từ các hãng bàn phím cơ, switch và phụ kiện.
				</p>
			</div>

			<div className="space-y-4">
				{releases.length > 0 ? (
					releases.map((release) => (
						<article
							key={release.id}
							className="group rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5 transition-all hover:shadow-float"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0 flex-1">
									<p className="text-sm font-black leading-snug text-on-surface group-hover:text-primary transition-colors">
										{release.title}
									</p>
									{release.excerpt && (
										<p className="mt-1.5 text-xs font-medium text-on-surface-variant line-clamp-2">
											{release.excerpt}
										</p>
									)}
									{!release.excerpt && (
										<p className="mt-1.5 text-xs font-medium text-on-surface-variant line-clamp-2">
											{trimContent(release.content)}
										</p>
									)}
									<div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-on-surface-variant/70">
										<div className="flex items-center gap-1">
											<CalendarDays size={12} />
											{release.published_at
												? new Date(release.published_at).toLocaleDateString(
														"vi-VN"
													)
												: ""}
										</div>
										{release.maker_name && (
											<span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
												{release.maker_name}
											</span>
										)}
									</div>
								</div>
								{release.source_url && (
									<a
										href={release.source_url}
										target="_blank"
										rel="noopener noreferrer"
										className="shrink-0 rounded-lg bg-surface-container p-2 text-on-surface-variant/50 transition-colors hover:bg-primary/10 hover:text-primary"
									>
										<ExternalLink size={16} />
									</a>
								)}
							</div>
						</article>
					))
				) : (
					<div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8 text-center">
						<p className="text-sm font-medium text-on-surface-variant">
							Chưa có tin tức nào. Quay lại sau!
						</p>
					</div>
				)}
			</div>

			<div className="mt-8 text-center">
				<Link
					href="/"
					className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:text-primary/80"
				>
					&larr; Quay lại trang chủ
				</Link>
			</div>
		</main>
	);
}
