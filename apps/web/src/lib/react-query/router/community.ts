import { createQueryKeys } from "@lukemorales/query-key-factory";

export interface CommunityListParams {
  type: string;
  page: number;
  limit: number;
}

export const communityQueryKeys = createQueryKeys("community", {
  posts: (params: CommunityListParams) => [params],
  documents: (page: number, limit: number, query?: string) => [
    { page, limit, query },
  ],
  config: null,
});