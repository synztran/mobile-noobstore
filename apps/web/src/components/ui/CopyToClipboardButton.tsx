"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

interface Props {
  value: string;
  label?: string;
  className?: string;
}

export function CopyToClipboardButton({
  value,
  label = "giá trị",
  className = "",
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);

  return (
    <button
      type="button"
      aria-label={`Sao chép ${label}`}
      onClick={handleCopy}
      className={`flex h-4 w-4 items-center justify-center rounded-full bg-surface-container transition-transform active:scale-90 ${className}`}
    >
      {copied ? (
        <Check size={14} className="text-secondary" />
      ) : (
        <Copy size={14} className="text-primary" />
      )}
    </button>
  );
}
