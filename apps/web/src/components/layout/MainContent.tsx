"use client";

import { usePathname } from "next/navigation";

export function MainContent({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	// Fullscreen arcade route: the page renders its own fixed, full-viewport
	// shell, so no top offset or min-height should be applied around it.
	const isFullscreenArcade = pathname === "/gacha-mega";
	const fixedMain = isFullscreenArcade
		? ""
		: pathname === "/gacha"
			? "max-h-dvh"
			: "min-main-content main-bottom-offset";

	return (
		<main
			id="main-layout"
			className={`${isFullscreenArcade ? "" : "main-top-offset"} ${fixedMain}`}
		>
			{children}
		</main>
	);
}
