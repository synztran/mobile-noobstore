"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "@/components/ui/AdaptiveImage";
import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageViewer({ images, initialIndex, isOpen, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const lastScale = useRef(1);
  // URLs whose bytes are already in the browser cache (preloaded or viewed).
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIndex(initialIndex);
    setScale(1);
    setImageLoaded(false);
    lastScale.current = 1;
  }, [initialIndex, isOpen]);

  // Spinner must reflect the CURRENT slide: without this reset the flag stays
  // true after the first load and later slides pop in with no indication.
  useEffect(() => {
    setImageLoaded(false);
  }, [index]);

  // ── Preloading ────────────────────────────────────────────────────────────
  // Warm the browser cache for neighbouring slides so a swipe gesture finishes
  // decoding before the finger leaves the screen; once idle, progressively
  // warm the whole gallery.
  const preload = useCallback((url: string) => {
    if (!url || preloadedRef.current.has(url)) return;
    preloadedRef.current.add(url);
    const img = new window.Image();
    img.src = url;
  }, []);

  useEffect(() => {
    if (!isOpen || images.length === 0) return;

    const neighbours = [
      images[(index + 1) % images.length],
      images[(index - 1 + images.length) % images.length],
    ];
    neighbours.forEach(preload);

    // Progressive full-gallery warm-up — staggered so it never competes with
    // the currently displayed image's bandwidth.
    const timers = images.map((img, i) => {
      if (Math.abs(i - index) <= 1) return null;
      return setTimeout(() => preload(img), 300 * i);
    });
    return () => timers.forEach((t) => t && clearTimeout(t));
  }, [isOpen, index, images, preload]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) return;
    touchStartX.current = e.touches[0].clientX;
    lastScale.current = scale;
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || scale > 1) {
        touchStartX.current = null;
        return;
      }
      const delta = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(delta) > 50) {
        setScale(1);
        lastScale.current = 1;
        setIndex(
          (prev) =>
            (prev + (delta < 0 ? 1 : -1) + images.length) % images.length
        );
      }
      touchStartX.current = null;
    },
    [images.length, scale]
  );

  const goTo = useCallback(
    (i: number) => {
      setScale(1);
      lastScale.current = 1;
      setIndex(i);
    },
    []
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="image-viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.15, duration: 0.2, ease: "easeOut" }}
            className="absolute right-4 top-14 z-10 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition-all active:scale-90"
          >
            Đóng
          </motion.button>

          <motion.div
            className="relative h-full w-full touch-pinch-zoom"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ transform: `scale(${scale})` }}
          >
            {/* Keep the previously loaded slide visible underneath so swiping
                never flashes to black while the next image decodes. */}
            {images.map(
              (img, i) =>
                i !== index &&
                preloadedRef.current.has(img) && (
                  <Image
                    key={`underlay-${img}`}
                    src={img}
                    alt=""
                    fill
                    className="object-contain opacity-0 pointer-events-none"
                    sizes="100vw"
                    draggable={false}
                  />
                )
            )}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="loading loading-spinner loading-lg text-white/60" />
              </div>
            )}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={images[index]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0"
              >
                <Image
                  src={images[index]}
                  alt=""
                  fill
                  className={`object-contain ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                  sizes="100vw"
                  priority
                  draggable={false}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {images.length > 1 && (
            <div
              className="absolute inset-x-0 bottom-8 z-10 flex justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
                {images.map((img, i) => (
                  <button
                    key={`dot-${img}`}
                    type="button"
                    aria-label={`Xem ảnh ${i + 1}/${images.length}`}
                    aria-current={i === index}
                    onClick={() => goTo(i)}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === index ? "w-4 bg-white" : "w-2 bg-white/55"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
