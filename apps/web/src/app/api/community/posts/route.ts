import {
  canUploadCommunity,
  MAX_MEDIA_PER_POST,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MEDIA_BUCKET,
  createSignedUploadUrls,
  getPostList,
  isAllowedImageMime,
  isAllowedVideoMime,
  isImageFileSize,
  isVideoFileSize,
  POST_TYPES,
} from "@/lib/community-server";
import {
  CACHE_KEYS,
  publicCacheHeaders,
  readThroughCache,
} from "@/lib/redis/cache";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300;

interface FileInput {
  name: string;
  mime: string;
  size: number;
  kind: "image" | "video";
}

// GET /api/community/posts — published feed, filterable by post_type.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get("type")?.trim() ?? "";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(sp.get("limit") ?? "12", 10) || 12),
  );

  try {
    const result = await readThroughCache(
      CACHE_KEYS.communityPostList(type, page, limit),
      300,
      () => getPostList(type, page, limit),
    );
    return NextResponse.json(result, { headers: publicCacheHeaders() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load posts" },
      { status: 500 },
    );
  }
}

// POST /api/community/posts
// Creates signed upload URLs for post media. Files are uploaded directly from
// the browser to Supabase Storage (bypassing Vercel's request-body cap), then
// the post is recorded via POST /api/community/posts/finalize.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const title = String(body.title ?? "").trim();
    const postType = String(body.post_type ?? "").trim();
    const files = Array.isArray(body.files) ? (body.files as FileInput[]) : [];

    if (title.length < 3 || title.length > 150) {
      return NextResponse.json(
        { error: "Tiêu đề phải có 3-150 ký tự" },
        { status: 400 },
      );
    }
    if (!POST_TYPES.includes(postType as (typeof POST_TYPES)[number])) {
      return NextResponse.json({ error: "Danh mục không hợp lệ" }, { status: 400 });
    }
    if (files.length === 0 || files.length > MAX_MEDIA_PER_POST) {
      return NextResponse.json(
        { error: `Phải có 1-${MAX_MEDIA_PER_POST} tệp phương tiện` },
        { status: 400 },
      );
    }

    for (const file of files) {
      const isVideo = file.kind === "video";
      if (isVideo && (!isAllowedVideoMime(file.mime) || !isVideoFileSize(file.size))) {
        return NextResponse.json(
          { error: `Video không hợp lệ (tối đa ${MAX_VIDEO_SIZE / 1024 / 1024} MB)` },
          { status: 400 },
        );
      }
      if (!isVideo && (!isAllowedImageMime(file.mime) || !isImageFileSize(file.size))) {
        return NextResponse.json(
          { error: `Hình ảnh không hợp lệ (tối đa ${MAX_IMAGE_SIZE / 1024 / 1024} MB)` },
          { status: 400 },
        );
      }
    }

    const allowed = await canUploadCommunity(user.id, "post");
    if (!allowed) {
      return NextResponse.json(
        { error: "Bạn chưa đủ điều kiện để đăng bài" },
        { status: 403 },
      );
    }

    const postId = crypto.randomUUID();
    const uploads = await createSignedUploadUrls(
      MEDIA_BUCKET,
      `${user.id}/${postId}`,
      files.map((f) => ({ name: f.name })),
    );

    if (uploads.length !== files.length) {
      return NextResponse.json(
        { error: "Không thể tạo đường dẫn tải lên" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      post_id: postId,
      uploads: uploads.map((u, i) => ({
        ...u,
        mime: files[i].mime,
        kind: files[i].kind,
        size: files[i].size,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}