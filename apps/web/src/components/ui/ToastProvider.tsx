"use client";

import { mountToaster, unmountToaster } from "gooey-toast";
import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

// gooey-toast CSS is ~55KB and nearly unused on pages without an active toast.
// Load it lazily (on the client) instead of a render-blocking <link> in <head>.
let cssPromise: Promise<unknown> | null = null;
function ensureToastCss() {
  if (!cssPromise) cssPromise = import("gooey-toast/styles.css");
  return cssPromise;
}

export function ToastProvider() {
	const pathname = usePathname();

	const measure = useCallback(() => {
		const nav = document.querySelector("nav");
		if (!nav) return;

		const leftBtn = nav.querySelector<HTMLElement>(
			'button[aria-label="Open menu"], button[aria-label="Go back"]',
		);
		const rightBtn = nav.querySelector<HTMLElement>("[data-cart-icon]");
		if (!leftBtn || !rightBtn) return;

		const available =
			rightBtn.getBoundingClientRect().left -
			leftBtn.getBoundingClientRect().right -
			24;

		if (available > 200) {
			document.documentElement.style.setProperty(
				"--gooey-width",
				`${Math.round(available)}px`,
			);
		}
	}, []);

	useEffect(() => {
		let disposed = false;
		let ro: ResizeObserver | null = null;

		void ensureToastCss().then(() => {
			if (disposed) return;
			mountToaster({
				position: "top-center",
				offset: { top: "env(safe-area-inset-top, 0px)" },
				options: {
					roundness: 8,
					timeoutIndicator: true,
				},
			});

			// Add ARIA live region to gooey-toast container for screen reader announcements
			const toastViewport = document.querySelector<HTMLElement>("section[data-gooey-viewport]");
			if (toastViewport) {
				toastViewport.setAttribute("aria-live", "polite");
				toastViewport.setAttribute("aria-atomic", "false");
			}

			measure();
			window.addEventListener("resize", measure);

			const nav = document.querySelector("nav");
			if (nav) {
				ro = new ResizeObserver(measure);
				ro.observe(nav);
			}
		});

		return () => {
			disposed = true;
			unmountToaster();
			window.removeEventListener("resize", measure);
			ro?.disconnect();
		};
	}, [measure]);

	useEffect(() => {
		measure();
	}, [pathname, measure]);

	return null;
}

export { gooeyToast as toast } from "gooey-toast";
