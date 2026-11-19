import { apiFetch } from "@/lib/api/fetch";
import type { PostRow, DocumentRow, ListResult } from "@/lib/community-server";
import { appQueryKeys } from "@/lib/react-query/root";
import { useQuery } from "@tanstack/react-query";


export interface CommunityConfigResponse {
  id: string;
  community_enabled: boolean;
  min_rank_level_post: number;
  firmware_enabled: boolean;
  min_rank_level_firmware: number;
  can_post: boolean;
  can_upload_firmware: boolean;
  current_rank_level: number | null;
}

async function parseError(res: Response): Promise<Error> {
  const payload = (await res.json().catch(() => null)) as
    | { error?: string }
    | null;
  return new Error(payload?.error ?? `Request failed (${res.status})`);
}

export function useCommunityConfig() {
  return useQuery<CommunityConfigResponse>({
    queryKey: appQueryKeys.community.config.queryKey,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const res = await apiFetch("/api/community/config", { signal });
      if (!res.ok) throw await parseError(res);
      return res.json();
    },
  });
}

export function usePostListQuery(type: string, page: number, limit = 12) {
  return useQuery<ListResult<PostRow>>({
    queryKey: appQueryKeys.community.posts({ type, page, limit }).queryKey,
    staleTime: 120_000,
    placeholderData: (prev) => prev,
    queryFn: async ({ signal }) => {
      const sp = new URLSearchParams({ type, page: String(page), limit: String(limit) });
      const res = await apiFetch(`/api/community/posts?${sp.toString()}`, { signal });
      if (!res.ok) throw await parseError(res);
      return res.json();
    },
  });
}

export function useDocumentListQuery(page: number, limit = 12, query = "") {
  return useQuery<ListResult<DocumentRow>>({
    queryKey: appQueryKeys.community.documents(page, limit, query).queryKey,
    staleTime: 120_000,
    placeholderData: (prev) => prev,
    queryFn: async ({ signal }) => {
      const sp = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (query) sp.set("q", query);
      const res = await apiFetch(`/api/documents?${sp.toString()}`, { signal });
      if (!res.ok) throw await parseError(res);
      return res.json();
    },
  });
}
