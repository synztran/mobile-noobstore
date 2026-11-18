/**
 * Downscale + re-encode an image file to WebP on the client before upload.
 *
 * Reduces payloads that Next.js served at full size once `images.unoptimized`
 * is enabled (no Vercel image optimizer / no Supabase transforms add-on).
 *
 * - GIFs are passed through untouched (keeps animation).
 * - Files already small are passed through untouched (no quality regressions).
 * - Falls back to the original file on any decode/encode failure.
 */
export async function optimizeImageFile(
  file: File,
  opts: { maxSize?: number; quality?: number; minBytes?: number } = {},
): Promise<File> {
  const { maxSize = 1440, quality = 0.82, minBytes = 150 * 1024 } = opts;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return file;
  }
  if (file.size < minBytes) {
    return file;
  }

  try {
    const src = await decodeImage(file);
    const scale = Math.min(1, maxSize / Math.max(src.naturalWidth, src.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(src.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(src.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    if (!blob || blob.size >= file.size) {
      return file;
    }

    const name = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}

function decodeImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    img.src = url;
  });
}