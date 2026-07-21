// Lightweight query key factories for admin app
// Keep simple and avoid adding extra dependencies here.

export const adminQueryKeys = {
  orders: (q = "", by = "order", page = 1) => ["orders", q, by, page] as const,
  orderDetail: (id?: string) => ["order-detail", id ?? ""] as const,

  products: {
    list: (q = "", productType = "", excludeSoldOut = false, page = 1) =>
      ["products", q, productType, excludeSoldOut, page] as const,
  },

  users: {
    list: (q = "", page = 1) => ["users", q, page] as const,
    detail: (id?: string) => ["user", id ?? ""] as const,
  },

  stockAlerts: {
    list: (page = 1) => ["stock-alerts", page] as const,
  },

  gacha: {
    events: () => ["gacha-events"] as const,
    event: (id?: string) => ["gacha-event", id ?? ""] as const,
    rewards: (eventId?: string) => ["gacha-rewards", eventId ?? ""] as const,
    rewardWinners: (eventId?: string, rewardId?: string) =>
      ["gacha-reward-winners", eventId ?? "", rewardId ?? ""] as const,
    missions: (eventId?: string) => ["gacha-missions", eventId ?? ""] as const,
    missionProgress: (eventId?: string, missionId?: string) =>
      ["gacha-mission-progress", eventId ?? "", missionId ?? ""] as const,
    blockedUsers: (eventId?: string) =>
      ["gacha-blocked-users", eventId ?? ""] as const,
    rewardHistoryUsers: (eventId?: string, search?: string, page?: number) =>
      [
        "gacha-reward-history-users",
        eventId ?? "",
        search ?? "",
        page ?? 0,
      ] as const,
    rewardHistoryPlays: (eventId?: string, userId?: string, page?: number) =>
      [
        "gacha-reward-history-plays",
        eventId ?? "",
        userId ?? "",
        page ?? 0,
      ] as const,
  },
};

export type AdminQueryKeys = typeof adminQueryKeys;
