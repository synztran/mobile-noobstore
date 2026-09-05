"use client";

import type { MissionType, TriggerResult } from "@/modules/gacha/types";

/**
 * Trigger a mission progress update from the browser.
 * Fire-and-forget safe — errors are caught and logged.
 */
export async function triggerMissionClient(
  eventId: number,
  missionType: MissionType,
  context: Record<string, unknown> = {}
): Promise<TriggerResult> {
  try {
    const res = await fetch("/api/gacha/mission/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        mission_type: missionType,
        context,
      }),
    });
    if (!res.ok) return { completed: [] };
    return (await res.json()) as TriggerResult;
  } catch {
    return { completed: [] };
  }
}