import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Blog - NoobStore",
	description:
		"Cập nhật tin tức, hướng dẫn và bài viết mới nhất từ NoobStore.",
	openGraph: {
		title: "Blog - NoobStore",
		description:
			"Cập nhật tin tức, hướng dẫn và bài viết mới nhất từ NoobStore.",
		url: "https://www.noobstore.xyz/blogs",
	},
};

export default function BlogLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
