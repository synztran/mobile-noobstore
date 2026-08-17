import { invalidateCache } from "@/lib/redis/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PATCH /api/documents/[id]
// - { status, reason? }: approve / reject / unapprove.
// - { title, keyboardName, version, notes }: edit document metadata.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const supabase = getAdminClient();

    if (typeof body.title === "string") {
      const title = String(body.title ?? "").trim();
      const keyboardName = String(body.keyboardName ?? "").trim();
      const version = String(body.version ?? "").trim();
      const notes = String(body.notes ?? "").trim();

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

      const { error } = await supabase
        .from("firmwares")
        .update({ title, keyboard_name: keyboardName, version, notes })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      await invalidateCache(
        "config:firmwares",
        "community:firmwares",
        "v2:community:firmwares",
      );

      return NextResponse.json({ success: true });
    }

    const status = String(body.status ?? "").trim();
    if (!["pending", "published", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
    }

    const reason =
      status === "rejected"
        ? String(body.reason ?? "").trim().slice(0, 500) || null
        : null;

    const { error } = await supabase
      .from("firmwares")
      .update({
        status,
        status_reason: reason,
        published_at:
          status === "published" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await invalidateCache(
      "config:firmwares",
      "community:firmwares",
      "v2:community:firmwares",
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}