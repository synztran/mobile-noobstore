import "server-only";

import { cache } from "react";
import { getAuctionById, getAuctionList, getUserBidHistory } from "./queries";
import type { AuctionStatus } from "../types";

export const getCachedAuctionList = cache(
  async (options?: { status?: AuctionStatus; isFeatured?: boolean; limit?: number }) => {
    return getAuctionList(options);
  }
);

export const getCachedAuctionById = cache(
  async (id: string, currentUserId?: string | null) => {
    return getAuctionById(id, currentUserId);
  }
);

export const getCachedUserBidHistory = cache(async (userId: string) => {
  return getUserBidHistory(userId);
});
