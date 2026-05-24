import type { ReactNode } from "react";

type TagTone =
	| "blue"
	| "green"
	| "yellow"
	| "purple"
	| "slate"
	| "red"
	| "indigo";

const toneClassMap: Record<TagTone, string> = {
	blue: "bg-blue-100 text-blue-700",
	green: "bg-green-100 text-green-700",
	yellow: "bg-yellow-100 text-yellow-700",
	purple: "bg-purple-100 text-purple-700",
	slate: "bg-slate-100 text-slate-700",
	red: "bg-red-100 text-red-700",
	indigo: "bg-indigo-100 text-indigo-700",
};

type TagProps = {
	children: ReactNode;
	tone?: TagTone;
	className?: string;
};

export default function Tag({
	children,
	tone = "slate",
	className = "",
}: TagProps) {
	return (
		<span
			className={`min-w-12 text-center text-xs px-2 py-0.5 rounded-md font-medium ${toneClassMap[tone]} ${className}`.trim()}>
			{children}
		</span>
	);
}
