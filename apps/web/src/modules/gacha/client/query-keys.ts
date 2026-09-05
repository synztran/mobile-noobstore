import { createQueryKeys } from "@lukemorales/query-key-factory";

export const gachaQueryKeys = createQueryKeys("gacha", {
  event: (eventId: number) => [eventId],
  history: (eventId: number) => [eventId],
  missions: (eventId: number) => [eventId],
  recentWinners: (eventId: number) => [eventId],
});