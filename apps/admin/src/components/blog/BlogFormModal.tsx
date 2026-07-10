"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { SingleImageUploader } from "@/components/ui/ImageUploader";

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
  open: boolean;
  onClose: () => void;
  mode: "create" | "update";
  post?: BlogPostRow;
};

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - timezoneOffset);
  return local.toISOString().slice(0, 16);
}

export default function BlogFormModal({ open, onClose, mode, post }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("");
  const [author, setAuthor] = useState("NoobStore");
  const [thumbnail, setThumbnail] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [tags, setTags] = useState("");
  const [published, setPublished] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [publishedAt, setPublishedAt] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);

    if (mode === "update" && post) {
      setSlug(post.slug ?? "");
      setTitle(post.title ?? "");
      setContent(post.content ?? "");
      setExcerpt(post.excerpt ?? "");
      setCategory(post.category ?? "");
      setAuthor(post.author ?? "NoobStore");
      setThumbnail(post.thumbnail ?? "");
      setMetaTitle(post.meta_title ?? "");
      setMetaDescription(post.meta_description ?? "");
      setOgImage(post.og_image ?? "");
      setTags((post.tags ?? []).join(", "));
      setPublished(Boolean(post.published));
      setFeatured(Boolean(post.featured));
      setPublishedAt(toDateTimeLocal(post.published_at));
      return;
    }

    setSlug("");
    setTitle("");
    setContent("");
    setExcerpt("");
    setCategory("");
    setAuthor("NoobStore");
    setThumbnail("");
    setMetaTitle("");
    setMetaDescription("");
    setOgImage("");
    setTags("");
    setPublished(false);
    setFeatured(false);
    setPublishedAt("");
  }, [open, mode, post]);

  if (!open) return null;

  const titleText = mode === "create" ? "Create New Post" : "Update Post";
  const submitLabel = mode === "create" ? "Create Post" : "Save Changes";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
      title: title.trim(),
      content,
      excerpt: excerpt.trim() || null,
      category: category.trim() || "Uncategorized",
      author: author.trim() || "NoobStore",
      thumbnail: thumbnail.trim() || null,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
      og_image: ogImage.trim() || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      published,
      featured,
      published_at: publishedAt
        ? new Date(publishedAt).toISOString()
        : null,
    };

    const url =
      mode === "create"
        ? "/api/blog"
        : `/api/blog/${post?.id ?? ""}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? `Failed to ${mode} post`);
      return;
    }

    onClose();
    router.refresh();
  }

  function autoSlug(title: string) {
    if (mode === "create" && !slug) {
      setSlug(title.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    }
  }

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
          <p className="text-lg font-semibold text-slate-900">{titleText}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    autoSlug(e.target.value);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Post title"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Slug <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="post-slug"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Hướng dẫn"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Author
                </label>
                <input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="NoobStore"
                />
              </div>
              <div className="md:col-span-2">
                <SingleImageUploader
                  value={thumbnail}
                  onChange={setThumbnail}
                  label="Thumbnail"
                  slug="blog"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Tags (comma separated)
                </label>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="keyboard, switch, guide"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Excerpt
              </label>
              <textarea
                rows={2}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Short description for listing"
              />
            </div>

            <RichTextEditor
              label="Content"
              value={content}
              onChange={setContent}
              required
              rows={12}
              placeholder="Nhập nội dung..."
            />

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                SEO & Scheduling
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Meta Title
                  </label>
                  <input
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="SEO title (defaults to title)"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Meta Description
                  </label>
                  <input
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="SEO description"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    OG Image URL
                  </label>
                  <input
                    value={ogImage}
                    onChange={(e) => setOgImage(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Published At
                  </label>
                  <input
                    type="datetime-local"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative h-6 w-11 rounded-full bg-slate-300 transition-colors after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-600 peer-checked:after:translate-x-full" />
                Published
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative h-6 w-11 rounded-full bg-slate-300 transition-colors after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-yellow-500 peer-checked:after:translate-x-full" />
                Featured
              </label>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? `${submitLabel}...` : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
