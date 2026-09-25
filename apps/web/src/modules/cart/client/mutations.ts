import type { AddCartItemRequest } from "@/modules/cart/types";
import { LoginRequiredError } from "@/modules/user/client/login-redirect";
import { appQueryKeys } from "@/lib/react-query/root";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";

function invalidateCart(client: ReturnType<typeof useQueryClient>) {
  client.invalidateQueries({ queryKey: appQueryKeys.cart.all.queryKey });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: AddCartItemRequest) => {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401)
        throw new LoginRequiredError("Vui lòng đăng nhập để thêm vào giỏ hàng");
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to add cart item" }));
        throw new Error(err.error ?? "Failed to add cart item");
      }
      return res.json() as Promise<{ cart_id: string; item_id: string }>;
    },
    onSuccess: () => invalidateCart(queryClient),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: number;
    }) => {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (res.status === 401)
        throw new LoginRequiredError("Vui lòng đăng nhập để cập nhật giỏ hàng");
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to update cart item" }));
        throw new Error(err.error ?? "Failed to update cart item");
      }
    },
    onSuccess: () => {
      invalidateCart(queryClient);
      toast.success(`Cập nhật số lượng sản phẩm thành công`);
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
      });
      if (res.status === 401)
        throw new LoginRequiredError("Vui lòng đăng nhập để chỉnh sửa giỏ hàng");
      if (!res.ok) throw new Error("Failed to remove cart item");
    },
    // Await the refetch so callers that key UI state off `onSettled` only
    // re-enable the row after the fresh cart has actually arrived — no gap
    // where the removed item is rendered but clickable again.
    onSuccess: async () => {
      await queryClient.refetchQueries({
        queryKey: appQueryKeys.cart.all.queryKey,
      });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cartId: string) => {
      const res = await fetch(
        `/api/cart?cart_id=${encodeURIComponent(cartId)}`,
        {
          method: "DELETE",
        }
      );
      if (res.status === 401)
        throw new LoginRequiredError("Vui lòng đăng nhập để xóa giỏ hàng");
      if (!res.ok) throw new Error("Failed to clear cart");
    },
    onSuccess: () => invalidateCart(queryClient),
  });
}
