"use client";

import { usePathname } from "next/navigation";

export function MainContent({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const fixedMain =
		pathname === "/gacha"
			? "max-h-screen"
			: "min-h-screen main-bottom-offset";

	return (
		<main id="main-layout" className={`main-top-offset ${fixedMain}`}>
			{children}
		</main>
	);
}
