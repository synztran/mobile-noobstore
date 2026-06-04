"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
	const [dark, setDark] = useState(false);

	useEffect(() => {
		const stored = localStorage.getItem("admin-theme");
		const isDark =
			stored === "dark" ||
			(!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
		setDark(isDark);
		document.documentElement.classList.toggle("dark", isDark);
	}, []);

	function toggle() {
		const next = !dark;
		setDark(next);
		document.documentElement.classList.toggle("dark", next);
		localStorage.setItem("admin-theme", next ? "dark" : "light");
	}

	return (
		<button
			onClick={toggle}
			className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
			title={dark ? "Switch to light mode" : "Switch to dark mode"}>
			{dark ? (
				<Sun className="w-5 h-5 text-yellow-400" />
			) : (
				<Moon className="w-5 h-5 text-slate-600" />
			)}
		</button>
	);
}
