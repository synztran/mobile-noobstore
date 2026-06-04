import Icon from "@/components/ui/Icon";
import Image from "next/image";
import React from "react";

export type ThumbnailProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
};

export const Thumbnail = React.memo(function Thumbnail({
  src,
  alt,
  className = "",
}: ThumbnailProps) {
  return (
    <div
      className={`relative overflow-hidden bg-surface-container-high flex-shrink-0 ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover mix-blend-darken"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon name="inventory_2" className="text-2xl text-outline-variant" />
        </div>
      )}
    </div>
  );
});
