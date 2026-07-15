"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

export default function ExcludeSoldOutToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const checked = searchParams?.get("exclude_sold_out") === "true";
  const [, startTransition] = useTransition();

  const handleChange = useCallback(
    (value: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("exclude_sold_out", "true");
      } else {
        params.delete("exclude_sold_out");
      }
      params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => handleChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      Hide sold out
    </label>
  );
}
