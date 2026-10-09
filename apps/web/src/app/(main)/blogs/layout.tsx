import type { Metadata } from "next";
import { buildOg } from "@/lib/og";

// No " - NoobStore" suffix: the root layout's title template appends it.
export const metadata: Metadata = buildOg({
	title: "Blog",
	description:
		"Cập nhật tin tức, hướng dẫn và bài viết mới nhất từ NoobStore.",
	url: "/blogs",
});

export default function BlogLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
