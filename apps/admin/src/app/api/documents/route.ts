import { invalidateCache } from "@/lib/redis/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_EXTENSIONS = [".hex", ".json", ".bin"];

function isAllowedFile(name: string): boolean {
  const ext = `.${name.split(".").pop() ?? ""}`.toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

// POST /api/documents — create a new document with uploaded firmware files.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const title = String(body.title ?? "").trim();
    const keyboardName = String(body.keyboardName ?? "").trim();
    const version = String(body.version ?? "").trim();
    const notes = String(body.notes ?? "").trim();
    const files = Array.isArray(body.files)
      ? (body.files as {
          name?: string;
          size?: number;
          mime?: string;
          url?: string;
        }[])
      : [];

    if (title.length < 3 || title.length > 150) {
      return NextResponse.json(
        { error: "Tiêu đề phải có 3-150 ký tự" },
        { status: 400 },
      );
    }
    if (!keyboardName) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên bàn phím" },
        { status: 400 },
      );
    }
    if (files.length === 0 || !files[0]?.name || !files[0]?.url) {
      return NextResponse.json(
        { error: "Vui lòng tải lên ít nhất một tệp (.hex, .json, .bin)" },
        { status: 400 },
      );
    }
    for (const file of files) {
      if (!file.name || !file.url || !isAllowedFile(file.name)) {
        return NextResponse.json(
          {
            error:
              "Tệp tài liệu không hợp lệ (chỉ hỗ trợ .hex, .json, .bin)",
          },
          { status: 400 },
        );
      }
    }

    const supabase = getAdminClient();
    const { data: admin } = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin")
      .maybeSingle();

    if (!admin?.id) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản quản trị" },
        { status: 500 },
      );
    }

    const fileEntries = files.map((f) => ({
      name: f.name!,
      size: f.size ?? 0,
      mime: f.mime ?? "application/octet-stream",
      url: f.url!,
    }));

    const { data: created, error } = await supabase
      .from("firmwares")
      .insert({
        author_id: admin.id,
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

    await invalidateCache(
      "config:firmwares",
      "community:firmwares",
      "v2:community:firmwares",
    );

    return NextResponse.json({ id: created.id, status: "pending" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
