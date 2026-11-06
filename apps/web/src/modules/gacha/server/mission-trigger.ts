import type { MissionType } from "@/modules/gacha/types";

export function isClientMissionTriggerAllowed(
  missionType: unknown
): missionType is Extract<MissionType, "login_count"> {
  return missionType === "login_count";
}
