"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
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
  const touchStartX = useRef<number | null>(null);
  const lastScale = useRef(1);

  useEffect(() => {
    setIndex(initialIndex);
    setScale(1);
    lastScale.current = 1;
  }, [initialIndex, isOpen]);

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
          onClick={onClose}
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
            <Image
              src={images[index]}
              alt=""
              fill
              className="object-contain"
              sizes="100vw"
              priority
              draggable={false}
            />
          </motion.div>

          {images.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ delay: 0.2, duration: 0.2, ease: "easeOut" }}
              className="absolute bottom-10 left-0 right-0 flex justify-center gap-2"
            >
              {images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  aria-label={`Ảnh ${i + 1} / ${images.length}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex(i);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
