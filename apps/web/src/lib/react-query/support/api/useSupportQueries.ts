import { appQueryKeys } from "@/lib/react-query/root";
import type { SupportListFilters } from "@/lib/react-query/router/support";
import type { SupportTicketListItem, TicketDetail } from "@/types/support";
import { useQuery } from "@tanstack/react-query";

interface SupportListResponse {
  tickets: SupportTicketListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export function useSupportTickets(filters: SupportListFilters) {
  return useQuery<SupportListResponse>({
    ...appQueryKeys.support.list(filters),
    staleTime: 60_000,
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(filters.page),
        limit: String(filters.limit),
      });
      if (filters.status) sp.set("status", filters.status);

      const res = await fetch(`/api/support/tickets?${sp}`);
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });
}

export function useSupportTicket(id: string | null) {
  return useQuery<TicketDetail>({
    ...appQueryKeys.support.detail(id ?? ""),
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch(`/api/support/tickets/${id}`);
      if (!res.ok) throw new Error("Failed to fetch ticket detail");
      return res.json();
    },
    enabled: !!id,
  });
}
