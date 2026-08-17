import {
  canUploadCommunity,
  MAX_MEDIA_PER_POST,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  MEDIA_BUCKET,
  isAllowedImageMime,
  isAllowedVideoMime,
  isImageFileSize,
  isVideoFileSize,
  POST_TYPES,
  getPublicUrl,
  getStorageObjectSize,
} from "@/lib/community-server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface UploadInput {
  path: string;
  mime: string;
  kind: "image" | "video";
  size: number;
}

// POST /api/community/posts/finalize
// Called after the browser uploaded files to the signed URLs from
// POST /api/community/posts. Re-verifies permission + recorded a post.
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

    const postId = String(body.post_id ?? "");
    const title = String(body.title ?? "").trim();
    const postType = String(body.post_type ?? "").trim();
    const content = String(body.content ?? "").trim().slice(0, 10000);
    const uploads = Array.isArray(body.uploads)
      ? (body.uploads as UploadInput[])
      : [];

    if (!postId) {
      return NextResponse.json({ error: "Thiếu mã bài viết" }, { status: 400 });
    }
    if (title.length < 3 || title.length > 150) {
      return NextResponse.json({ error: "Tiêu đề phải có 3-150 ký tự" }, { status: 400 });
    }
    if (!POST_TYPES.includes(postType as (typeof POST_TYPES)[number])) {
      return NextResponse.json({ error: "Danh mục không hợp lệ" }, { status: 400 });
    }
    if (uploads.length === 0 || uploads.length > MAX_MEDIA_PER_POST) {
      return NextResponse.json({ error: "Tệp phương tiện không hợp lệ" }, { status: 400 });
    }

    const folderPrefix = `${user.id}/${postId}/`;
    const media = [];

    for (const upload of uploads) {
      if (!upload.path.startsWith(folderPrefix)) {
        return NextResponse.json(
          { error: "Đường dẫn tệp không hợp lệ" },
          { status: 400 },
        );
      }
      const isVideo = upload.kind === "video";
      if (isVideo && (!isAllowedVideoMime(upload.mime) || !isVideoFileSize(upload.size))) {
        return NextResponse.json(
          { error: "Video không hợp lệ hoặc vượt quá 200 MB" },
          { status: 400 },
        );
      }
      if (!isVideo && (!isAllowedImageMime(upload.mime) || !isImageFileSize(upload.size))) {
        return NextResponse.json(
          { error: "Hình ảnh không hợp lệ hoặc vượt quá 8 MB" },
          { status: 400 },
        );
      }

      // Best-effort cross-check of the actual stored size (skipped if metadata
      // is unavailable for the object yet).
      const actual = await getStorageObjectSize(MEDIA_BUCKET, upload.path);
      if (
        actual !== null &&
        (upload.size < actual * 0.9 || upload.size > Math.max(actual * 1.1, actual + 1))
      ) {
        return NextResponse.json(
          { error: "Kích thước tệp trên máy chủ không khớp" },
          { status: 400 },
        );
      }

      media.push({
        url: getPublicUrl(MEDIA_BUCKET, upload.path),
        path: upload.path,
        mime: upload.mime,
        kind: upload.kind,
        size: upload.size,
      });
    }

    const allowed = await canUploadCommunity(user.id, "post");
    if (!allowed) {
      return NextResponse.json(
        { error: "Bạn chưa đủ điều kiện để đăng bài" },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        author_id: user.id,
        title,
        post_type: postType,
        content,
        media: media as unknown as Record<string, never>[],
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      status: "pending",
      message: "Bài viết đã được gửi và đang chờ duyệt",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}