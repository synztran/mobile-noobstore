import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BUCKET = "document";
const ALLOWED_EXTENSIONS = [".hex", ".json", ".bin"];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = `.${file.name.split(".").pop() ?? ""}`.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      {
        error: "Invalid file type. Only .hex, .json, and .bin files are allowed.",
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 50 MB." },
      { status: 400 }
    );
  }

  // Sanitize filename — keep a readable display name but scope the storage
  // path to a unique folder so uploads can never collide or traverse.
  const safeName =
    file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 150) || `file${ext}`;
  const uniqueFolder = `${Date.now()}-${crypto.randomUUID()}`;
  const storagePath = `${uniqueFolder}/${safeName}`;

  const supabase = getAdminClient();

  // Ensure bucket exists — create it (public) if not yet provisioned
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === BUCKET);
  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(
      BUCKET,
      { public: true }
    );
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
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return NextResponse.json(
    {
      name: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
      path: storagePath,
      url: urlData.publicUrl,
    },
    { status: 201 }
  );
}