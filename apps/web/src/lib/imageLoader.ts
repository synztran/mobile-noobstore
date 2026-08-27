import type { ImageLoaderProps } from "next/image";

const supabaseLoader = ({ src, width, quality }: ImageLoaderProps) => {
  // Supabase images are served directly from the CDN.
  // Skip Next.js /_next/image optimization to avoid timeout failures
  // when Supabase CDN responses are slow.
  const params = new URLSearchParams({
    width: String(width),
    quality: String(quality ?? 75),
  });
  // Append the original query string if present (e.g. transform params)
  const qIndex = src.indexOf("?");
  if (qIndex !== -1) {
    const existing = new URLSearchParams(src.slice(qIndex));
    existing.forEach((v, k) => params.set(k, v));
  }
  return `${src}${src.includes("?") ? "" : "?"}${params.toString()}`;
};

export default function imageLoader(props: ImageLoaderProps) {
  const { src } = props;
  if (
    src.includes(".supabase.co/") ||
    src.includes(".supabase.in/")
  ) {
    return supabaseLoader(props);
  }
  // Fallback: use default Next.js optimizer for other domains
  return `/_next/image?url=${encodeURIComponent(src)}&w=${props.width}&q=${props.quality ?? 75}`;
}
