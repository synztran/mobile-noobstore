"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CircleHelp } from "lucide-react";

interface CheckoutError {
  code: string;
  title: string;
  description: string;
  resolution: string;
}

export default function CheckoutErrorCodesPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["checkout-error-codes"],
    queryFn: async () => {
      const response = await fetch("/api/checkout-error-codes");
      if (!response.ok) throw new Error("Failed to load checkout error codes");
      return response.json() as Promise<{ errors: CheckoutError[] }>;
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-heading">Checkout error codes</h1>
        <p className="mt-1 text-sm text-muted">
          Internal explanations and resolution steps. Customers receive codes only.
        </p>
      </header>

      {isPending ? (
        <div className="space-y-3" aria-label="Loading error codes">
          {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      ) : isError ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Could not load checkout error codes. Refresh to try again.
        </p>
      ) : (
        <div className="space-y-4">
          {data?.errors.map((error) => (
            <article key={error.code} className="rounded-xl border border-base-300 bg-base-100 p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <AlertTriangle aria-hidden="true" className="h-4 w-4 text-amber-600" />
                <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm text-heading">{error.code}</code>
                <h2 className="font-semibold text-heading">{error.title}</h2>
              </div>
              <p className="mt-3 text-sm text-body">{error.description}</p>
              <div className="mt-4 flex gap-2 text-sm text-muted">
                <CircleHelp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p><span className="font-medium text-heading">Resolution:</span> {error.resolution}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
