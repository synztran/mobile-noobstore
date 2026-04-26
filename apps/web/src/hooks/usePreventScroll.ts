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

		// Prevent touchmove on body (iOS)
		const preventScroll = (e: TouchEvent) => {
			e.preventDefault();
		};

		document.body.addEventListener("touchmove", preventScroll, {
			passive: false,
		});

		// Cleanup
		return () => {
			document.body.style.overflow = "";
			document.body.removeEventListener("touchmove", preventScroll);
		};
	}, [isOpen]);
}
