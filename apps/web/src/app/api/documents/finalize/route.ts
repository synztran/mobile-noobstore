import {
  MAX_FIRMWARE_SIZE,
  FIRMWARE_BUCKET,
  getPublicUrl,
  getStorageObjectSize,
  isAllowedFirmwareMime,
  isFirmwareFileSize,
} from "@/lib/community-server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/documents/finalize (authenticated)
// Called after the browser uploaded the document's files to the signed URLs
// from POST /api/documents. Records the firmware row with its `files` jsonb.
// Documents require admin approval before they are published, so any
// logged-in user may submit.
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

    const documentId = String(body.document_id ?? "");
    const title = String(body.title ?? "").trim();
    const keyboardName = String(body.keyboard_name ?? "").trim();
    const version = String(body.version ?? "").trim();
    const notes = String(body.notes ?? "").trim().slice(0, 2000);
    const files = Array.isArray(body.files)
      ? (body.files as { name?: string; mime?: string; size?: number; path?: string }[])
      : [];

    if (!documentId) {
      return NextResponse.json({ error: "Thiếu mã tài liệu" }, { status: 400 });
    }
    if (title.length < 3 || title.length > 150) {
      return NextResponse.json({ error: "Tiêu đề phải có 3-150 ký tự" }, { status: 400 });
    }
    if (!keyboardName) {
      return NextResponse.json({ error: "Vui lòng nhập tên bàn phím" }, { status: 400 });
    }
    if (files.length === 0) {
      return NextResponse.json({ error: "Thiếu tệp tài liệu" }, { status: 400 });
    }

    const folderPrefix = `${user.id}/${documentId}/`;
    for (const file of files) {
      if (!file.name || !file.mime || typeof file.size !== "number" || !file.path) {
        return NextResponse.json({ error: "Thiếu thông tin tệp" }, { status: 400 });
      }
      if (!file.path.startsWith(folderPrefix)) {
        return NextResponse.json(
          { error: "Đường dẫn tệp không hợp lệ" },
          { status: 400 },
        );
      }
      if (!isAllowedFirmwareMime(file.mime) || !isFirmwareFileSize(file.size)) {
        return NextResponse.json({ error: "Tệp tài liệu không hợp lệ" }, { status: 400 });
      }
    }

    const fileEntries: { name: string; size: number; mime: string; url: string }[] = [];
    for (const file of files) {
      const actual = await getStorageObjectSize(FIRMWARE_BUCKET, file.path!);
      if (
        actual !== null &&
        (file.size! < actual * 0.9 || file.size! > Math.max(actual * 1.1, actual + 1))
      ) {
        return NextResponse.json(
          { error: `Kích thước tệp ${file.name} trên máy chủ không khớp` },
          { status: 400 },
        );
      }
      fileEntries.push({
        name: file.name!,
        size: file.size!,
        mime: file.mime!,
        url: getPublicUrl(FIRMWARE_BUCKET, file.path!),
      });
    }

    const { data, error } = await supabase
      .from("firmwares")
      .insert({
        author_id: user.id,
        title,
        keyboard_name: keyboardName,
        version,
        notes,
        file_url: fileEntries[0].url,
        file_name: fileEntries[0].name,
        file_size: fileEntries[0].size,
        mime_type: fileEntries[0].mime,
        files: fileEntries,
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
      message: "Tài liệu đã được gửi và đang chờ duyệt",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}