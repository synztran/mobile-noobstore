"use client";

import { FileText, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BlogFormModal from "./BlogFormModal";

type BlogPostRow = {
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
  og_image: string | null;
  tags: string[] | null;
  published: boolean | null;
  featured: boolean | null;
  published_at: string | null;
  created_at: string | null;
};

type Props = {
  posts: BlogPostRow[];
};

export default function BlogTable({ posts }: Props) {
  const router = useRouter();
  const [editPost, setEditPost] = useState<BlogPostRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    setDeleting(id);

    const res = await fetch(`/api/blog/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "Failed to delete post");
    }
    setDeleting(null);
  }

  function statusBadge(published: boolean | null) {
    if (published) {
      return (
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
          Published
        </span>
      );
    }
    return (
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
        Draft
      </span>
    );
  }

  function featuredBadge(featured: boolean | null) {
    if (!featured) return null;
    return (
      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
        Featured
      </span>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Title
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Category
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Date
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {posts.length > 0 ? (
              posts.map((post) => (
                <tr key={post.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {post.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          /{post.slug}
                        </p>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {featuredBadge(post.featured)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {post.category}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {statusBadge(post.published)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {post.published_at
                      ? new Date(post.published_at).toLocaleDateString("vi-VN")
                      : post.created_at
                        ? new Date(post.created_at).toLocaleDateString("vi-VN")
                        : "-"}
                  </td>
                  <td className="space-x-2 px-6 py-4 text-sm">
                    <button
                      type="button"
                      onClick={() => setEditPost(post)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      <Pencil className="mr-1 inline-block h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      disabled={deleting === post.id}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="mr-1 inline-block h-4 w-4" />
                      {deleting === post.id ? "..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  No blog posts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <BlogFormModal
        open={editPost !== null}
        onClose={() => setEditPost(null)}
        mode="update"
        post={editPost ?? undefined}
      />
    </>
  );
}
