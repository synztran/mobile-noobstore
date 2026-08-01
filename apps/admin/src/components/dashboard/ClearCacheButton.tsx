"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

interface Props {
  scope?: "products";
  label?: string;
}

export default function ClearCacheButton({ scope, label = "Clear Redis Cache" }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleClear() {
    if (
      !window.confirm(
        scope === "products"
          ? "Clear product list caches? This may slow the storefront until caches rebuild."
          : "Clear all product caches? This may slow the storefront until caches rebuild."
      )
    ) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scope ? { scope } : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data?.error ?? "Failed to clear cache" });
      } else {
        setMessage({ type: "success", text: "Product caches cleared" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to clear cache" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClear}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow transition-colors hover:bg-slate-50 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Clearing…" : label}
      </button>
      {message && (
        <span
          className={`text-sm ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </span>
      )}
    </div>
  );
}
