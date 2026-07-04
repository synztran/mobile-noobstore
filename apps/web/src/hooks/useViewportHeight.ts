"use client";

import { useEffect } from "react";

export function useViewportHeight() {
  useEffect(() => {
    function update() {
      const vh = window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${vh}px`);
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
}
