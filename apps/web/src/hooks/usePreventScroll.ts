import { useEffect } from "react";

/**
 * Hook to prevent body scroll when a modal/drawer/dialog is open.
 * Supports both desktop and iOS devices.
 *
 * @param isOpen - Whether the modal/drawer is open
 */
export function usePreventScroll(isOpen: boolean) {
	useEffect(() => {
		if (!isOpen) return;

		// Prevent scroll on body (desktop)
		document.body.style.overflow = "hidden";

		// Prevent background touch scroll on iOS, but keep drawer/content scrollable.
		const preventScroll = (e: TouchEvent) => {
			const target = e.target as Element | null;
			const isInsideScrollableArea = Boolean(
				target?.closest(
					"[data-allow-scroll], .overflow-y-auto, .overflow-auto",
				),
			);

			if (!isInsideScrollableArea) {
				e.preventDefault();
			}
		};

		document.addEventListener("touchmove", preventScroll, {
			passive: false,
		});

		// Cleanup
		return () => {
			document.body.style.overflow = "";
			document.removeEventListener("touchmove", preventScroll);
		};
	}, [isOpen]);
}
