import { apiFetch } from "@/lib/api/fetch";
import { appQueryKeys } from "@/lib/react-query/root";
import { useMutation, useQueryClient } from "@tanstack/react-query";


export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiFetch("/api/support/tickets", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create ticket");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appQueryKeys.support.list._def });
    },
  });
}
