import type { CommunityMedia } from "@/lib/community-server";
import Image from "@/components/ui/AdaptiveImage";

interface Props {
  media: CommunityMedia;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export function PostMedia({ media, className = "", priority, sizes }: Props) {
  if (media.kind === "video") {
    return (
      <video
        src={media.url}
        className={className}
        preload="metadata"
        muted
        playsInline
        controls
      />
    );
  }

  return (
    <Image
      src={media.url}
      alt=""
      fill
      priority={priority}
      sizes={sizes ?? "(max-width: 640px) 100vw, 50vw"}
      className={className}
    />
  );
}