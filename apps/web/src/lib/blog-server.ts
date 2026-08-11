import { getPublicClient } from "@/lib/supabase/public";

export interface BlogListResult {
	data: unknown[];
	count: number;
	page: number;
	limit: number;
	totalPages: number;
}

export async function getBlogList(
	category: string,
	page: number,
	limit: number,
): Promise<BlogListResult> {
	const supabase = getPublicClient();

	let query = supabase
		.from("blog_posts")
		.select("*", { count: "exact", head: false })
		.eq("published", true)
		.order("published_at", { ascending: false })
		.order("created_at", { ascending: false });

	if (category) {
		query = query.ilike("category", `%${category}%`);
	}

	const from = (page - 1) * limit;
	const to = from + limit - 1;
	query = query.range(from, to);

	const { data, error, count } = await query;

	if (error) {
		throw error;
	}

	return {
		data: data ?? [],
		count: count ?? 0,
		page,
		limit,
		totalPages: Math.ceil((count ?? 0) / limit),
	};
}