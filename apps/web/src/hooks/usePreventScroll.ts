import { useEffect } from "react";

export function usePreventScroll(isOpen: boolean) {
	useEffect(() => {
		if (!isOpen) return;

		const body = document.body;
		const scrollY = window.scrollY;

		const originalOverflow = body.style.overflow;
		const originalPosition = body.style.position;
		const originalTop = body.style.top;
		const originalLeft = body.style.left;
		const originalWidth = body.style.width;
		const originHeihgt = body.style.height;

		body.style.overflow = "hidden";
		body.style.position = "fixed";
		body.style.top = `-${scrollY}px`;
		body.style.width = "100%";
		body.style.height = "100dvh";

		return () => {
			body.style.overflow = originalOverflow;
			body.style.position = originalPosition;
			body.style.top = originalTop;
			body.style.left = originalLeft;
			body.style.width = originalWidth;
			body.style.height = originHeihgt;
			window.scrollTo(0, scrollY);
		};
	}, [isOpen]);
}
