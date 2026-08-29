"use client";

import Image from "next/image";
import { useState } from "react";
import type { ComponentProps } from "react";

type ImageProps = ComponentProps<typeof Image>;
type ImageErrorHandler = NonNullable<ImageProps["onError"]>;

type AdaptiveImageProps = Omit<ImageProps, "onError"> & {
  onError?: ImageErrorHandler;
};

// Site-wide failover flag. When the Vercel optimizer is out of quota it
// returns HTTP 402 for any non-cached variant (breaking gallery images). The
// first failed optimizer request in a browsing session marks it down, so every
// image that mounts afterwards (and re-mounts on client-side navigation) skips
// _next/image and hits the origin (Supabase CDN) directly. A fresh page load
// starts a new session → the optimizer is tried once again and automatically
// resumes as soon as the monthly quota has reset.
let optimizerDown = false;

export default function AdaptiveImage({
  onError,
  ...props
}: AdaptiveImageProps) {
  const [failed, setFailed] = useState(false);

  // Caller opted out explicitly (QR codes, data URIs), the optimizer is
  // already known-down this session, or this image already failed → render
  // the raw src through to keep the frame, never blank.
  const raw = props.unoptimized || optimizerDown || failed;
  if (raw) {
    return <Image {...props} unoptimized onError={onError} />;
  }

  return (
    <Image
      {...props}
      onError={(event) => {
        optimizerDown = true;
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}