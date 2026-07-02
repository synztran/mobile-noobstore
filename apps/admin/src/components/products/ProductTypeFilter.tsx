"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

const PRODUCT_TYPE_OPTIONS = [
  { label: "All Types", value: "all" },
  { label: "Standard", value: "standard" },
  { label: "Kit", value: "kit" },
  { label: "Component", value: "component" },
  { label: "Gift", value: "gift" },
];

export default function ProductTypeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentValue = searchParams?.get("product_type") ?? "all";
  const [, startTransition] = useTransition();

  console.log("currentValue", currentValue);

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set("product_type", value);
      } else {
        params.delete("product_type");
      }
      params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <select
      aria-label="Filter by product type"
      value={currentValue}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {PRODUCT_TYPE_OPTIONS.map((option) => (
        <option key={option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
