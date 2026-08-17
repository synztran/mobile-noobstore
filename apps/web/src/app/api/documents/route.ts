import {
  MAX_FIRMWARE_SIZE,
  FIRMWARE_BUCKET,
  createSignedUploadUrls,
  getDocumentList,
  isAllowedFirmwareMime,
  isFirmwareFileSize,
} from "@/lib/community-server";
import {
  CACHE_KEYS,
  publicCacheHeaders,
  readThroughCache,
} from "@/lib/redis/cache";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300;

// GET /api/documents — published firmware library, filterable by keyboard name.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(
    50,
    Math.max(1, parseInt(sp.get("limit") ?? "12", 10) || 12),
  );
  const query = (sp.get("q") ?? "").trim();

  try {
    const result = await readThroughCache(
      CACHE_KEYS.documentList(page, limit, query),
      300,
      () => getDocumentList(page, limit, query),
    );
    return NextResponse.json(result, { headers: publicCacheHeaders() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load documents" },
      { status: 500 },
    );
  }
}

// POST /api/documents (authenticated)
// Creates signed upload URLs for the document's files. The files are then
// uploaded directly to Supabase Storage and recorded via
// POST /api/documents/finalize. Documents require admin approval before they
// are published, so any logged-in user may submit.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const title = String(body.title ?? "").trim();
    const keyboardName = String(body.keyboard_name ?? "").trim();
    const version = String(body.version ?? "").trim();
    const notes = String(body.notes ?? "").trim().slice(0, 2000);
    const files = Array.isArray(body.files)
      ? (body.files as { name?: string; mime?: string; size?: number }[])
      : [];

    if (title.length < 3 || title.length > 150) {
      return NextResponse.json({ error: "Tiêu đề phải có 3-150 ký tự" }, { status: 400 });
    }
    if (!keyboardName) {
      return NextResponse.json({ error: "Vui lòng nhập tên bàn phím" }, { status: 400 });
    }
    if (files.length === 0) {
      return NextResponse.json({ error: "Vui lòng chọn ít nhất một tệp" }, { status: 400 });
    }
    for (const file of files) {
      if (!file.name || !file.mime || typeof file.size !== "number") {
        return NextResponse.json({ error: "Thiếu thông tin tệp" }, { status: 400 });
      }
      if (!isAllowedFirmwareMime(file.mime) || !isFirmwareFileSize(file.size)) {
        return NextResponse.json(
          { error: `Tệp ${file.name} không hợp lệ (tối đa ${MAX_FIRMWARE_SIZE / 1024 / 1024} MB)` },
          { status: 400 },
        );
      }
    }

    const documentId = crypto.randomUUID();
    const uploads = await createSignedUploadUrls(
      FIRMWARE_BUCKET,
      `${user.id}/${documentId}`,
      files.map((f) => ({ name: f.name! })),
    );

    if (uploads.length !== files.length) {
      return NextResponse.json(
        { error: "Không thể tạo đường dẫn tải lên" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      document_id: documentId,
      files: files.map((f, i) => ({
        name: f.name,
        mime: f.mime,
        size: f.size,
        path: uploads[i].path,
        url: uploads[i].url,
      })),
      title,
      keyboard_name: keyboardName,
      version,
      notes,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}