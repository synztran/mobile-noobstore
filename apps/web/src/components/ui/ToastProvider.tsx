"use client";

import { mountToaster, unmountToaster } from "gooey-toast";
import { useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

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
		mountToaster({
			position: "top-center",
			options: {
				roundness: 8,
				timeoutIndicator: true,
			},
		});

		measure();
		window.addEventListener("resize", measure);

		const nav = document.querySelector("nav");
		const ro = new ResizeObserver(measure);
		if (nav) ro.observe(nav);

		return () => {
			unmountToaster();
			window.removeEventListener("resize", measure);
			ro.disconnect();
		};
	}, [measure]);

	useEffect(() => {
		measure();
	}, [pathname, measure]);

	return null;
}

export { gooeyToast as toast } from "gooey-toast";
