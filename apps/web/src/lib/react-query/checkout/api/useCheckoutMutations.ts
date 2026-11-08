/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ValidateStockResponse } from "@/app/api/checkout/validate-stock/route";
import type {
  SubmitOrderRequest,
  SubmitOrderResponse,
} from "@/modules/checkout/types";
import { useMutation } from "@tanstack/react-query";

export function useValidateStock() {
  return useMutation({
    mutationFn: async (items: any[]) => {
      const res = await fetch("/api/checkout/validate-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      return (await res.json()) as ValidateStockResponse;
    },
  });
}

export function useSubmitOrder() {
  return useMutation({
    // Typed against the route contract so a payload drift (e.g. the
    // persisted store handing over `cartId: string | null`) is a compile
    // error here rather than a silent runtime field.
    mutationFn: async (payload: SubmitOrderRequest) => {
      const res = await fetch("/api/checkout/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const code = typeof data.error_code === "string" && /^CHECKOUT_[A-Z_]+$/.test(data.error_code)
          ? data.error_code
          : "CHECKOUT_SUBMIT_FAILED";
        throw new Error(code);
      }
      return data as SubmitOrderResponse;
    },
  });
}
