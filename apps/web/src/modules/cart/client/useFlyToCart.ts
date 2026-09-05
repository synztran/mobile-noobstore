"use client";

import { create } from "zustand";

interface FlyToCartState {
  isAnimating: boolean;
  imageUrl: string;
  startRect: { left: number; top: number; width: number; height: number };
  flyToCart: (imageUrl: string, sourceElement: HTMLElement) => void;
  clearFly: () => void;
}

export const useFlyToCartStore = create<FlyToCartState>()((set) => ({
  isAnimating: false,
  imageUrl: "",
  startRect: { left: 0, top: 0, width: 0, height: 0 },
  flyToCart: (imageUrl, sourceElement) => {
    const rect = sourceElement.getBoundingClientRect();
    set({
      isAnimating: true,
      imageUrl,
      startRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
    });
  },
  clearFly: () => set({ isAnimating: false }),
}));
