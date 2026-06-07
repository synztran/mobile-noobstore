import type { GachaEvent } from "@/app/(admin)/gacha/page";

export async function fetchEvents(): Promise<GachaEvent[]> {
  const res = await fetch("/api/gacha/events");
  if (!res.ok) throw new Error("Failed to fetch events");
  return res.json();
}

export async function fetchRewards(eventId: string) {
  const res = await fetch(`/api/gacha/events/${eventId}/rewards`);
  if (!res.ok) throw new Error("Failed to fetch rewards");
  return (await res.json()) as any[];
}

export async function fetchRewardWinners(eventId: string, rewardId: string) {
  const res = await fetch(
    `/api/gacha/events/${eventId}/rewards/${rewardId}/winners`
  );
  if (!res.ok) throw new Error("Failed to fetch reward winners");
  return (await res.json()) as any[];
}

export async function fetchMissions(eventId: string) {
  const res = await fetch(`/api/gacha/events/${eventId}/missions`);
  if (!res.ok) throw new Error("Failed to fetch missions");
  return (await res.json()) as any[];
}

export async function fetchMissionProgress(eventId: string, missionId: string) {
  const res = await fetch(
    `/api/gacha/events/${eventId}/missions/${missionId}/progress`
  );
  if (!res.ok) throw new Error("Failed to fetch mission progress");
  return (await res.json()) as any[];
}

export async function fetchBlockedUsers(eventId: string) {
  const res = await fetch(`/api/gacha/events/${eventId}/blocked-users`);
  if (!res.ok) throw new Error("Failed to fetch blocked users");
  return (await res.json()) as any[];
}

export async function fetchRewardHistoryUsers(
  eventId: string,
  params?: { limit?: number; offset?: number; search?: string }
) {
  const p = new URLSearchParams();
  if (params?.limit) p.set("limit", String(params.limit));
  if (params?.offset) p.set("offset", String(params.offset));
  if (params?.search) p.set("search", params.search);
  const res = await fetch(
    `/api/gacha/events/${eventId}/reward-history?${p.toString()}`
  );
  if (!res.ok) throw new Error("Failed to fetch reward history users");
  return await res.json();
}

export async function fetchUserPlays(
  eventId: string,
  userId: string,
  params?: { limit?: number; offset?: number }
) {
  const p = new URLSearchParams();
  if (params?.limit) p.set("limit", String(params.limit));
  if (params?.offset) p.set("offset", String(params.offset));
  const res = await fetch(
    `/api/gacha/events/${eventId}/reward-history/${userId}?${p.toString()}`
  );
  if (!res.ok) throw new Error("Failed to fetch user plays");
  return await res.json();
}
