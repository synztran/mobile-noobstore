"use client";

import MobileWarning from "@/components/warning-modal";
import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";
const DISMISS_KEY = "mobile_warning_dismissed";

export function MobileViewportGuard() {
	const [mounted, setMounted] = useState(false);
	const [isMobile, setIsMobile] = useState(true);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		setMounted(true);

		const mediaQuery = window.matchMedia(MOBILE_QUERY);
		const updateViewport = () => setIsMobile(mediaQuery.matches);

		updateViewport();
		setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");

		mediaQuery.addEventListener("change", updateViewport);
		return () => mediaQuery.removeEventListener("change", updateViewport);
	}, []);

	const handleContinue = () => {
		sessionStorage.setItem(DISMISS_KEY, "1");
		setDismissed(true);
	};

	if (!mounted || isMobile || dismissed) {
		return null;
	}

	return <MobileWarning onContinue={handleContinue} showContinueButton />;
}

export default MobileViewportGuard;
