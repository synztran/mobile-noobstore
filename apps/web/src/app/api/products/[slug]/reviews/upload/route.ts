import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { canUserReviewProduct } from "../eligibility";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BUCKET = "ticket-attachments";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 4;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const { data: product } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (
      !product ||
      !(await canUserReviewProduct(supabase, user.id, product.id))
    ) {
      return NextResponse.json(
        { error: "Chỉ khách đã nhận sản phẩm mới có thể tải ảnh đánh giá" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Tối đa ${MAX_FILES} hình ảnh mỗi lần đánh giá` },
        { status: 400 }
      );
    }

    const admin = getAdminClient();
    const urls: string[] = [];

    for (const file of files) {
      if (file.size === 0 || file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Ảnh ${file.name} vượt quá dung lượng tối đa 5MB` },
          { status: 400 }
        );
      }

      if (file.type && !ALLOWED_MIME.has(file.type)) {
        return NextResponse.json(
          {
            error: `Định dạng ảnh không hợp lệ (${file.type}). Chỉ chấp nhận JPG, PNG, WEBP.`,
          },
          { status: 400 }
        );
      }

      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `reviews/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadErr } = await admin.storage
        .from(BUCKET)
        .upload(filePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadErr) {
        console.error("[review upload error]:", uploadErr);
        return NextResponse.json(
          { error: `Tải ảnh ${file.name} thất bại` },
          { status: 500 }
        );
      }

      const { data } = admin.storage.from(BUCKET).getPublicUrl(filePath);
      urls.push(data.publicUrl);
    }

    return NextResponse.json({ urls }, { status: 201 });
  } catch (err) {
    console.error("[review-upload] unexpected error:", err);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tải ảnh" },
      { status: 500 }
    );
  }
}
