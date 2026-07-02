import { createQueryKeys } from "@lukemorales/query-key-factory";
import type {
  GachaEvent,
  GachaRewardMeta,
  GachaEventResponse,
  HistoryReward,
  HistoryEntry,
  GachaHistoryPage,
  GachaMission,
} from "@/types/gacha";

export const gachaQueryKeys = createQueryKeys("gacha", {
  event: (eventId: number) => [eventId],
  history: (eventId: number) => [eventId],
  missions: (eventId: number) => [eventId],
  recentWinners: (eventId: number) => [eventId],
});

export type {
  GachaEvent,
  GachaRewardMeta,
  GachaEventResponse,
  HistoryReward,
  HistoryEntry,
  GachaHistoryPage,
  GachaMission,
};
