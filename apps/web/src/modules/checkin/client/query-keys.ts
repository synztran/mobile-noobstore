import { createQueryKeys } from "@lukemorales/query-key-factory";

export const checkinQueryKeys = createQueryKeys("checkin", {
  calendar: (month: string) => ({ queryKey: ["calendar", month] as const }),
});
