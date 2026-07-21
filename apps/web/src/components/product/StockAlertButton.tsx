"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import {
  useStockAlertCheck,
  useStockAlertSubscribe,
  useStockAlertUnsubscribe,
} from "@/lib/react-query/stock-alert/api/useStockAlertQueries";
import { useRouter } from "next/navigation";
import { BellRing, BellOff } from "lucide-react";

interface Props {
  productId: string;
  variantId?: string;
}

export function StockAlertButton({ productId, variantId = "" }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const { data, isLoading: checkLoading } = useStockAlertCheck(
    productId,
    variantId,
  );
  const subscribe = useStockAlertSubscribe();
  const unsubscribe = useStockAlertUnsubscribe();

  const isLoggedIn = !!user;
  const subscribed = data?.subscribed ?? false;
  const loading = checkLoading || subscribe.isPending || unsubscribe.isPending;
  const disabled = loading || !isLoggedIn;

  const handleClick = () => {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (subscribed) {
      unsubscribe.mutate({ productId, variantId });
    } else {
      subscribe.mutate({ productId, variantId });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-primary/30 text-xs font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <span className="loading loading-spinner loading-xs" />
      ) : subscribed ? (
        <BellOff size={16} />
      ) : (
        <BellRing size={16} />
      )}
      {!isLoggedIn ? "Cần đăng nhập" : subscribed ? "Đã đăng ký" : "Báo khi có hàng"}
    </button>
  );
}
