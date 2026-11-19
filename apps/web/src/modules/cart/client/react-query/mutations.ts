import { apiFetch } from "@/lib/api/fetch";
import type { AddCartItemRequest } from "@/modules/cart/types";
import { LoginRequiredError } from "@/modules/user/client/login-redirect";
import { appQueryKeys } from "@/lib/react-query/root";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { useCartStore } from "../hooks/useCartStore";


function invalidateCart(client: ReturnType<typeof useQueryClient>) {
  client.invalidateQueries({ queryKey: appQueryKeys.cart.all.queryKey });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: AddCartItemRequest) => {
      const res = await apiFetch("/api/cart/items", {
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
        const msg = err.error ?? "Failed to add cart item";
        if (err.available !== undefined && Number(err.available) >= 0) {
          throw new Error(
            `Chỉ còn ${Number(err.available)} sản phẩm này trong kho`
          );
        }
        throw new Error(msg);
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
      const res = await apiFetch(`/api/cart/items/${itemId}`, {
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
        const msg = err.error ?? "Failed to update cart item";
        if (err.available !== undefined && Number(err.available) >= 0) {
          throw new Error(
            `Chỉ còn ${Number(err.available)} sản phẩm này trong kho`
          );
        }
        throw new Error(msg);
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
      const res = await apiFetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
      });
      if (res.status === 401)
        throw new LoginRequiredError(
          "Vui lòng đăng nhập để chỉnh sửa giỏ hàng"
        );
      if (!res.ok) throw new Error("Failed to remove cart item");
    },
    onMutate: async (itemId: string) => {
      // Optimistically remove from local store so UI re-renders immediately
      const store = useCartStore.getState();
      const item = store.items.find((i) => i.id === itemId);
      if (item) {
        store.removeItem(item.product.id, item.variant?.id ?? null, itemId);
      }
    },
    onSuccess: async () => {
      invalidateCart(queryClient);
      await queryClient.refetchQueries({
        queryKey: appQueryKeys.cart.all.queryKey,
      });
    },
    onError: () => {
      // Rollback/sync if server rejected the deletion
      invalidateCart(queryClient);
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cartId: string) => {
      const res = await apiFetch(
        `/api/cart?cart_id=${encodeURIComponent(cartId)}`,
        {
          method: "DELETE",
        }
      );
      if (res.status === 401)
        throw new LoginRequiredError("Vui lòng đăng nhập để xóa giỏ hàng");
      if (!res.ok) throw new Error("Failed to clear cart");
    },
    onMutate: async () => {
      // Optimistically clear store
      useCartStore.getState().clearCart();
    },
    onSuccess: () => invalidateCart(queryClient),
    onError: () => {
      // Rollback/sync if server rejected
      invalidateCart(queryClient);
    },
  });
}
