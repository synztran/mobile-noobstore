import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BUCKET = "Products";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.",
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5 MB." },
      { status: 400 }
    );
  }

  // Extension comes entirely from literal code paths — no user input reaches storagePath
  let safeExt: string;
  switch (file.type) {
    case "image/png":
      safeExt = "png";
      break;
    case "image/webp":
      safeExt = "webp";
      break;
    case "image/gif":
      safeExt = "gif";
      break;
    default:
      safeExt = "jpg";
      break;
  }
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}`;

  // Use slug as folder prefix if provided — sanitize to allow only safe chars
  const rawSlug = formData.get("slug");
  const slugPrefix =
    typeof rawSlug === "string" && rawSlug.trim().length > 0
      ? rawSlug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 100)
      : "uploads";
  const storagePath = `${slugPrefix}/${uniqueName}.${safeExt}`;

  const supabase = getAdminClient();

  // Ensure bucket exists — create it (public) if not yet provisioned
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET);
  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: true,
    });
    if (createError) {
      return NextResponse.json(
        { error: `Storage setup failed: ${createError.message}` },
        { status: 500 }
      );
    }
  }

  const arrayBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
      // Object URLs are immutable (unique filename per upload) → safe to cache
      // hard in the browser/CDN. Long TTL means return visits fetch product
      // images from local cache instead of revalidating every time.
      cacheControl: "public, max-age=31536000, immutable",
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
}
