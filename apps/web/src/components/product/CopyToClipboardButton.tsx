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
			title={label}
			className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface">
			{copied ? (
				<Check className="h-4 w-4" />
			) : (
				<Copy className="h-4 w-4" />
			)}
		</button>
	);
}
