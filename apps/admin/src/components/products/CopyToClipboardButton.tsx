"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type CopyToClipboardButtonProps = {
	value: string;
	label?: string;
};

export default function CopyToClipboardButton({
	value,
	label = "Copy to clipboard",
}: CopyToClipboardButtonProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			setCopied(false);
		}
	};

	return (
		<button
			type="button"
			onClick={() => void handleCopy()}
			aria-label={label}
			title={copied ? "Copied" : label}
			className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700">
			{copied ? (
				<Check className="h-3.5 w-3.5" />
			) : (
				<Copy className="h-3.5 w-3.5" />
			)}
		</button>
	);
}
