import { getAdminClient } from "@/lib/supabase/admin";
import BlogTable from "@/components/blog/BlogTable";
import CreateBlogPostButton from "@/components/blog/CreateBlogPostButton";

export const metadata = {
  title: "Blog - NoobStore Admin",
};

export default async function BlogPage(props: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const search = (searchParams.search ?? "").trim();
  const status = searchParams.status ?? "";

  const supabase = getAdminClient();

  let query = supabase
    .from("blog_posts")
    .select("*", { count: "exact", head: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  if (status === "published") {
    query = query.eq("published", true);
  } else if (status === "draft") {
    query = query.eq("published", false);
  }

  const { data: posts, error, count } = await query;

  if (error) {
    console.error("Error fetching blog posts:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold text-slate-900">Blog Posts</p>
        <CreateBlogPostButton />
      </div>

      <form method="GET" className="flex flex-wrap items-center gap-3">
        <input
          name="search"
          type="text"
          placeholder="Tìm kiếm tiêu đề / slug..."
          defaultValue={search}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <select
          name="status"
          defaultValue={status || "all"}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Tất cả</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Tìm kiếm
        </button>
        {(search || status) && (
          <a
            href="/blog"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200"
          >
            Xoá bộ lọc
          </a>
        )}
      </form>

      <p className="text-sm text-slate-500">
        {count != null ? `${count.toLocaleString("vi-VN")} bài viết` : ""}
      </p>

      <BlogTable posts={posts ?? []} />
    </div>
  );
}
